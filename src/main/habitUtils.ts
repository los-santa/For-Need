import { RRule, RRuleSet, rrulestr } from 'rrule';
import { DateTime } from 'luxon';
import Database from 'better-sqlite3';

/**
 * RRULE 전개 입력 인터페이스
 */
export interface HabitExpansionInput {
  cardId: string;
  dtstartLocal: string;   // 'YYYY-MM-DDTHH:MM:SS'
  tzid: string;           // e.g., 'Asia/Seoul'
  rrule: string;          // RFC5545
  rdates?: string[];      // ISO8601 local
  exdates?: string[];     // ISO8601 local
  windowStartUtc: string; // ISO8601Z
  windowEndUtc: string;   // ISO8601Z
  durationMinutes?: number; // 기본 0 (체크형)
}

/**
 * 습관 속성 인터페이스
 */
export interface HabitProperties {
  cardId: string;
  dtstartLocal: string;
  tzid: string;
  rrule: string;
  rdatesJson?: string;
  exdatesJson?: string;
  wkst?: string;
  untilUtc?: string;
  countLimit?: number;
  durationMinutes: number;
  minSpacingMinutes: number;
  unitLabel?: string;
  targetPerOccurrence: number;
  maxPerDay?: number;
  rolloverMode: string;
  weeklyQuota?: number;
  monthlyQuota?: number;
  adherenceTarget?: number;
  streakCount: number;
  longestStreak: number;
  lastCompletedAt?: string;
  notifyEnabled: number;
  notifyBeforeMin?: number;
  notifyAtLocal?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  colorHex?: string;
  icon?: string;
  notes?: string;
}

/**
 * 로컬 시간을 UTC로 변환
 */
function localToUtc(localTimeStr: string, tzid: string): string {
  const dt = DateTime.fromISO(localTimeStr, { zone: tzid });
  return dt.toUTC().toISO() || '';
}

/**
 * UTC를 로컬 시간으로 변환
 */
function utcToLocal(utcTimeStr: string, tzid: string): string {
  const dt = DateTime.fromISO(utcTimeStr, { zone: 'utc' });
  return dt.setZone(tzid).toISO() || '';
}

/**
 * occurrence_key 생성 (UTC 시각을 'YYYYMMDDTHHMMSSZ' 형식으로)
 */
function generateOccurrenceKey(utcTimeStr: string): string {
  const dt = DateTime.fromISO(utcTimeStr, { zone: 'utc' });
  return dt.toFormat('yyyyMMddTHHmmss') + 'Z';
}

/**
 * RRULE 전개 및 인스턴스 캐시 upsert
 */
export async function expandAndUpsertInstances(db: Database.Database, input: HabitExpansionInput): Promise<void> {
  const transaction = db.transaction(() => {
    try {
      // 기존 캐시에서 해당 범위 삭제
      const deleteStmt = db.prepare(`
        DELETE FROM habit_instances_cache 
        WHERE card_id = ? 
        AND start_utc >= ? 
        AND start_utc <= ?
      `);
      deleteStmt.run(input.cardId, input.windowStartUtc, input.windowEndUtc);

      // dtstart를 UTC로 변환
      const dtstartUtc = localToUtc(input.dtstartLocal, input.tzid);
      const dtstart = DateTime.fromISO(dtstartUtc, { zone: 'utc' }).toJSDate();

      // 윈도우 범위
      const windowStart = DateTime.fromISO(input.windowStartUtc, { zone: 'utc' }).toJSDate();
      const windowEnd = DateTime.fromISO(input.windowEndUtc, { zone: 'utc' }).toJSDate();

      // RRule 객체 생성
      const rrule = rrulestr(input.rrule, { dtstart });

      // 기본 반복 인스턴스들 생성
      const instances = rrule.between(windowStart, windowEnd, true);

      // RDATE 추가 (있다면)
      let allInstances = [...instances];
      if (input.rdates && input.rdates.length > 0) {
        const rdateInstances = input.rdates
          .map(rdate => {
            const rdateUtc = localToUtc(rdate, input.tzid);
            const rdateDate = DateTime.fromISO(rdateUtc, { zone: 'utc' }).toJSDate();
            return rdateDate;
          })
          .filter(date => date >= windowStart && date <= windowEnd);
        
        allInstances = [...allInstances, ...rdateInstances];
      }

      // EXDATE 제외 (있다면)
      let finalInstances = allInstances;
      if (input.exdates && input.exdates.length > 0) {
        const exdatesUtc = input.exdates.map(exdate => {
          const exdateUtc = localToUtc(exdate, input.tzid);
          return DateTime.fromISO(exdateUtc, { zone: 'utc' }).toJSDate();
        });
        
        finalInstances = allInstances.filter(instance => {
          return !exdatesUtc.some(exdate => 
            Math.abs(instance.getTime() - exdate.getTime()) < 1000 // 1초 오차 허용
          );
        });
      }

      // 중복 제거 및 정렬
      const uniqueInstances = Array.from(
        new Set(finalInstances.map(d => d.getTime()))
      ).map(time => new Date(time)).sort((a, b) => a.getTime() - b.getTime());

      // 인스턴스 캐시에 삽입
      const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO habit_instances_cache 
        (card_id, occurrence_key, start_utc, end_utc, is_exception, generated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `);

      for (const instance of uniqueInstances) {
        const startUtc = DateTime.fromJSDate(instance, { zone: 'utc' }).toISO();
        const occurrenceKey = generateOccurrenceKey(startUtc || '');
        
        let endUtc = null;
        if (input.durationMinutes && input.durationMinutes > 0) {
          const endTime = DateTime.fromJSDate(instance, { zone: 'utc' })
            .plus({ minutes: input.durationMinutes });
          endUtc = endTime.toISO();
        }

        insertStmt.run(
          input.cardId,
          occurrenceKey,
          startUtc,
          endUtc,
          0, // is_exception
        );
      }

    } catch (error) {
      console.error('Error in expandAndUpsertInstances:', error);
      throw error;
    }
  });

  transaction();
}

/**
 * 습관 체크 (멱등 처리)
 */
export async function checkHabit(
  db: Database.Database, 
  cardId: string, 
  occurrenceKeyUtc: string, 
  quantity: number = 1, 
  note?: string
): Promise<void> {
  const transaction = db.transaction(() => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO habit_logs 
      (card_id, occurrence_key, done_quantity, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, 
        COALESCE((SELECT created_at FROM habit_logs WHERE card_id = ? AND occurrence_key = ?), datetime('now')),
        datetime('now')
      )
    `);
    
    stmt.run(cardId, occurrenceKeyUtc, quantity, note || null, cardId, occurrenceKeyUtc);
  });
  
  transaction();
}

/**
 * 습관 언체크 (멱등 처리)
 */
export async function uncheckHabit(
  db: Database.Database, 
  cardId: string, 
  occurrenceKeyUtc: string
): Promise<void> {
  const transaction = db.transaction(() => {
    const stmt = db.prepare(`
      DELETE FROM habit_logs 
      WHERE card_id = ? AND occurrence_key = ?
    `);
    
    stmt.run(cardId, occurrenceKeyUtc);
  });
  
  transaction();
}

/**
 * 수량 설정 (멱등 처리)
 */
export async function setQuantity(
  db: Database.Database, 
  cardId: string, 
  occurrenceKeyUtc: string, 
  quantity: number
): Promise<void> {
  if (quantity <= 0) {
    return uncheckHabit(db, cardId, occurrenceKeyUtc);
  }
  
  return checkHabit(db, cardId, occurrenceKeyUtc, quantity);
}

/**
 * 오늘 미완료 습관들 조회
 */
export async function getTodayPending(
  db: Database.Database, 
  localDayStartIso: string, 
  localDayEndIso: string, 
  tzid: string
) {
  const dayStartUtc = localToUtc(localDayStartIso, tzid);
  const dayEndUtc = localToUtc(localDayEndIso, tzid);
  
  const stmt = db.prepare(`
    SELECT 
      hic.*,
      c.title,
      hp.unit_label,
      hp.target_per_occurrence,
      hp.color_hex,
      hp.icon
    FROM habit_instances_cache hic
    JOIN CARDS c ON hic.card_id = c.id
    JOIN habit_properties hp ON hic.card_id = hp.card_id
    LEFT JOIN habit_logs hl ON hic.card_id = hl.card_id AND hic.occurrence_key = hl.occurrence_key
    WHERE hic.start_utc >= ? 
    AND hic.start_utc < ? 
    AND hic.is_exception = 0
    AND c.deleted_at IS NULL
    AND hp.deleted_at IS NULL
    AND hp.status = 'active'
    AND hl.id IS NULL
    ORDER BY hic.start_utc
  `);
  
  return stmt.all(dayStartUtc, dayEndUtc);
}

/**
 * 오늘 완료된 습관들 조회
 */
export async function getTodayDone(
  db: Database.Database, 
  localDayStartIso: string, 
  localDayEndIso: string, 
  tzid: string
) {
  const dayStartUtc = localToUtc(localDayStartIso, tzid);
  const dayEndUtc = localToUtc(localDayEndIso, tzid);
  
  const stmt = db.prepare(`
    SELECT 
      hic.*,
      c.title,
      hp.unit_label,
      hp.target_per_occurrence,
      hp.color_hex,
      hp.icon,
      hl.done_quantity,
      hl.note,
      hl.updated_at as completed_at
    FROM habit_instances_cache hic
    JOIN CARDS c ON hic.card_id = c.id
    JOIN habit_properties hp ON hic.card_id = hp.card_id
    JOIN habit_logs hl ON hic.card_id = hl.card_id AND hic.occurrence_key = hl.occurrence_key
    WHERE hic.start_utc >= ? 
    AND hic.start_utc < ? 
    AND hic.is_exception = 0
    AND c.deleted_at IS NULL
    AND hp.deleted_at IS NULL
    ORDER BY hic.start_utc
  `);
  
  return stmt.all(dayStartUtc, dayEndUtc);
}

/**
 * 최근 N일간 달성률 계산
 */
export async function getAdherenceLastNDays(
  db: Database.Database, 
  cardId: string,
  days: number = 30
): Promise<number> {
  const endDate = DateTime.now().toUTC();
  const startDate = endDate.minus({ days });
  
  const totalStmt = db.prepare(`
    SELECT COUNT(*) as total
    FROM habit_instances_cache 
    WHERE card_id = ? 
    AND start_utc >= ? 
    AND start_utc <= ?
    AND is_exception = 0
  `);
  
  const completedStmt = db.prepare(`
    SELECT COUNT(*) as completed
    FROM habit_instances_cache hic
    JOIN habit_logs hl ON hic.card_id = hl.card_id AND hic.occurrence_key = hl.occurrence_key
    WHERE hic.card_id = ? 
    AND hic.start_utc >= ? 
    AND hic.start_utc <= ?
    AND hic.is_exception = 0
  `);
  
  const totalResult = totalStmt.get(cardId, startDate.toISO(), endDate.toISO()) as any;
  const completedResult = completedStmt.get(cardId, startDate.toISO(), endDate.toISO()) as any;
  
  const total = totalResult?.total || 0;
  const completed = completedResult?.completed || 0;
  
  return total > 0 ? (completed / total) * 100 : 0;
}

/**
 * 현재 스트릭 계산 (역순으로 연속 완료 구간)
 */
export async function getCurrentStreak(db: Database.Database, cardId: string): Promise<number> {
  const stmt = db.prepare(`
    SELECT 
      hic.occurrence_key,
      hic.start_utc,
      CASE WHEN hl.id IS NOT NULL THEN 1 ELSE 0 END as is_completed
    FROM habit_instances_cache hic
    LEFT JOIN habit_logs hl ON hic.card_id = hl.card_id AND hic.occurrence_key = hl.occurrence_key
    WHERE hic.card_id = ? 
    AND hic.is_exception = 0
    AND hic.start_utc <= datetime('now')
    ORDER BY hic.start_utc DESC
  `);
  
  const instances = stmt.all(cardId) as any[];
  let streak = 0;
  
  for (const instance of instances) {
    if (instance.is_completed) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

/**
 * 최장 스트릭 계산
 */
export async function getLongestStreak(db: Database.Database, cardId: string): Promise<number> {
  const stmt = db.prepare(`
    SELECT 
      hic.occurrence_key,
      hic.start_utc,
      CASE WHEN hl.id IS NOT NULL THEN 1 ELSE 0 END as is_completed
    FROM habit_instances_cache hic
    LEFT JOIN habit_logs hl ON hic.card_id = hl.card_id AND hic.occurrence_key = hl.occurrence_key
    WHERE hic.card_id = ? 
    AND hic.is_exception = 0
    ORDER BY hic.start_utc ASC
  `);
  
  const instances = stmt.all(cardId) as any[];
  let maxStreak = 0;
  let currentStreak = 0;
  
  for (const instance of instances) {
    if (instance.is_completed) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  
  return maxStreak;
}

/**
 * RRULE 변경 시 캐시 재전개 처리
 */
export async function onRRuleUpdated(
  db: Database.Database, 
  cardId: string, 
  oldProps: Partial<HabitProperties>, 
  newProps: Partial<HabitProperties>
): Promise<void> {
  const transaction = db.transaction(() => {
    try {
      // 현재 시점 기준으로 ±6주 범위 설정
      const now = DateTime.now().toUTC();
      const windowStart = now.minus({ weeks: 6 });
      const windowEnd = now.plus({ weeks: 6 });
      
      // 영향 범위의 기존 캐시 삭제 (미래분만 - 과거 로그는 보존)
      const deleteStmt = db.prepare(`
        DELETE FROM habit_instances_cache 
        WHERE card_id = ? 
        AND start_utc >= ?
      `);
      deleteStmt.run(cardId, now.toISO());
      
      // 새로운 RRULE로 캐시 재생성
      if (newProps.dtstartLocal && newProps.tzid && newProps.rrule) {
        const expansionInput: HabitExpansionInput = {
          cardId,
          dtstartLocal: newProps.dtstartLocal,
          tzid: newProps.tzid,
          rrule: newProps.rrule,
          rdates: newProps.rdatesJson ? JSON.parse(newProps.rdatesJson) : undefined,
          exdates: newProps.exdatesJson ? JSON.parse(newProps.exdatesJson) : undefined,
          windowStartUtc: windowStart.toISO() || '',
          windowEndUtc: windowEnd.toISO() || '',
          durationMinutes: newProps.durationMinutes || 0
        };
        
        // 동기 버전으로 직접 호출 (이미 트랜잭션 내부이므로)
        expandAndUpsertInstancesSync(db, expansionInput);
      }
      
    } catch (error) {
      console.error('Error in onRRuleUpdated:', error);
      throw error;
    }
  });
  
  transaction();
}

/**
 * 동기 버전의 인스턴스 전개 (트랜잭션 내부용)
 */
function expandAndUpsertInstancesSync(db: Database.Database, input: HabitExpansionInput): void {
  // 기존 캐시에서 해당 범위 삭제
  const deleteStmt = db.prepare(`
    DELETE FROM habit_instances_cache 
    WHERE card_id = ? 
    AND start_utc >= ? 
    AND start_utc <= ?
  `);
  deleteStmt.run(input.cardId, input.windowStartUtc, input.windowEndUtc);

  // dtstart를 UTC로 변환
  const dtstartUtc = localToUtc(input.dtstartLocal, input.tzid);
  const dtstart = DateTime.fromISO(dtstartUtc, { zone: 'utc' }).toJSDate();

  // 윈도우 범위
  const windowStart = DateTime.fromISO(input.windowStartUtc, { zone: 'utc' }).toJSDate();
  const windowEnd = DateTime.fromISO(input.windowEndUtc, { zone: 'utc' }).toJSDate();

  // RRule 객체 생성
  const rrule = rrulestr(input.rrule, { dtstart });

  // 기본 반복 인스턴스들 생성
  const instances = rrule.between(windowStart, windowEnd, true);

  // RDATE/EXDATE 처리 (위와 동일한 로직)
  let allInstances = [...instances];
  if (input.rdates && input.rdates.length > 0) {
    const rdateInstances = input.rdates
      .map(rdate => {
        const rdateUtc = localToUtc(rdate, input.tzid);
        return DateTime.fromISO(rdateUtc, { zone: 'utc' }).toJSDate();
      })
      .filter(date => date >= windowStart && date <= windowEnd);
    
    allInstances = [...allInstances, ...rdateInstances];
  }

  let finalInstances = allInstances;
  if (input.exdates && input.exdates.length > 0) {
    const exdatesUtc = input.exdates.map(exdate => {
      const exdateUtc = localToUtc(exdate, input.tzid);
      return DateTime.fromISO(exdateUtc, { zone: 'utc' }).toJSDate();
    });
    
    finalInstances = allInstances.filter(instance => {
      return !exdatesUtc.some(exdate => 
        Math.abs(instance.getTime() - exdate.getTime()) < 1000
      );
    });
  }

  // 중복 제거 및 정렬
  const uniqueInstances = Array.from(
    new Set(finalInstances.map(d => d.getTime()))
  ).map(time => new Date(time)).sort((a, b) => a.getTime() - b.getTime());

  // 인스턴스 캐시에 삽입
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO habit_instances_cache 
    (card_id, occurrence_key, start_utc, end_utc, is_exception, generated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);

  for (const instance of uniqueInstances) {
    const startUtc = DateTime.fromJSDate(instance, { zone: 'utc' }).toISO();
    const occurrenceKey = generateOccurrenceKey(startUtc || '');
    
    let endUtc = null;
    if (input.durationMinutes && input.durationMinutes > 0) {
      const endTime = DateTime.fromJSDate(instance, { zone: 'utc' })
        .plus({ minutes: input.durationMinutes });
      endUtc = endTime.toISO();
    }

    insertStmt.run(
      input.cardId,
      occurrenceKey,
      startUtc,
      endUtc,
      0, // is_exception
    );
  }
}
