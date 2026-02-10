import { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Switch } from './components/ui/switch';
import { Label } from './components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Plus, GitBranch, ArrowRight, X } from 'lucide-react';

interface Circle {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  name: string;
  value: number;
  rank: number;
  level: number;
}

interface Arrow {
  id: number;
  from: number;
  to: number;
}

// 테마 색상에 맞춘 black/gray/white 스타일 색상 팔레트
const COLORS = ['#808080', '#A0A0A0', '#606060', '#909090', '#707070', '#B0B0B0', '#505050', '#C0C0C0'];

export default function App() {
  const [circles, setCircles] = useState<Circle[]>([]);

  const [draggedCircleId, setDraggedCircleId] = useState<number | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const justFinishedDrawing = useRef(false);

  const [arrowMode, setArrowMode] = useState(false);
  const [selectedCircleForArrow, setSelectedCircleForArrow] = useState<number | null>(null);
  const [nextCircleId, setNextCircleId] = useState(1);
  const [nextArrowId, setNextArrowId] = useState(1);

  const [editingCircleId, setEditingCircleId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const [focusedCircleId, setFocusedCircleId] = useState<number | null>(null);

  const [arrows, setArrows] = useState<Arrow[]>([]);

  // Cmd/Ctrl + 드래그로 화살표 그리기
  const [drawingArrow, setDrawingArrow] = useState<{ fromId: number; x: number; y: number } | null>(null);

  const getCircleById = (id: number) => circles.find((c) => c.id === id);

  const calculateArrowPath = (from: Circle, to: Circle) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);

    // 화살표 시작점 (from 원의 가장자리)
    const startX = from.x + Math.cos(angle) * from.radius;
    const startY = from.y + Math.sin(angle) * from.radius;

    // 화살표 끝점 (to 원의 가장자리)
    const endX = to.x - Math.cos(angle) * to.radius;
    const endY = to.y - Math.sin(angle) * to.radius;

    return { startX, startY, endX, endY, angle };
  };

  const createArrowhead = (x: number, y: number, angle: number) => {
    const size = 12;
    const angle1 = angle + Math.PI * 0.8;
    const angle2 = angle - Math.PI * 0.8;

    const x1 = x + Math.cos(angle1) * size;
    const y1 = y + Math.sin(angle1) * size;
    const x2 = x + Math.cos(angle2) * size;
    const y2 = y + Math.sin(angle2) * size;

    return `M ${x} ${y} L ${x1} ${y1} M ${x} ${y} L ${x2} ${y2}`;
  };

  // 연결된 그룹을 찾는 함수 (Union-Find 사용)
  const findConnectedGroups = (circlesList: Circle[], arrowsList: Arrow[]): Map<number, number[]> => {
    const parent = new Map<number, number>();

    // 초기화: 각 노드의 부모는 자기 자신
    circlesList.forEach(circle => {
      parent.set(circle.id, circle.id);
    });

    // Find 함수 (경로 압축 포함)
    const find = (id: number): number => {
      if (parent.get(id) !== id) {
        parent.set(id, find(parent.get(id)!));
      }
      return parent.get(id)!;
    };

    // Union 함수
    const union = (id1: number, id2: number) => {
      const root1 = find(id1);
      const root2 = find(id2);
      if (root1 !== root2) {
        parent.set(root2, root1);
      }
    };

    // 화살표로 연결된 노드들을 합침 (무방향으로 처리)
    arrowsList.forEach(arrow => {
      union(arrow.from, arrow.to);
    });

    // 그룹별로 노드들을 모음
    const groups = new Map<number, number[]>();
    circlesList.forEach(circle => {
      const root = find(circle.id);
      if (!groups.has(root)) {
        groups.set(root, []);
      }
      groups.get(root)!.push(circle.id);
    });

    return groups;
  };

  // 노드값 계산 함수 (연결된 그룹별로 계산)
  const calculateNodeValues = (circlesList: Circle[], arrowsList: Arrow[]): Circle[] => {
    // 연결된 그룹 찾기
    const groups = findConnectedGroups(circlesList, arrowsList);

    const circlesWithValues = circlesList.map(circle => ({
      ...circle,
      x: circle.x ?? 0,
      y: circle.y ?? 0,
      radius: circle.radius ?? 55
    }));

    // 각 그룹별로 독립적으로 value 계산
    groups.forEach((groupIds) => {
      const valueCache = new Map<number, number>();

      const calculateValue = (nodeId: number, visited: Set<number> = new Set()): number => {
        // 순환 참조 방지
        if (visited.has(nodeId)) return 0;

        // 이미 계산된 값이 있으면 반환
        if (valueCache.has(nodeId)) {
          return valueCache.get(nodeId)!;
        }

        // 해당 노드에서 나가는 화살표들을 찾음
        const outgoingArrows = arrowsList.filter(arrow => arrow.from === nodeId);

        // 나가는 화살표가 없으면 리프 노드 (값 = 0)
        if (outgoingArrows.length === 0) {
          valueCache.set(nodeId, 0);
          return 0;
        }

        // 깊이 1인 노드들의 개수
        const count = outgoingArrows.length;

        // 깊이 1인 노드들의 값의 합을 재귀적으로 계산
        const newVisited = new Set(visited);
        newVisited.add(nodeId);

        const sum = outgoingArrows.reduce((acc, arrow) => {
          return acc + calculateValue(arrow.to, newVisited);
        }, 0);

        const value = count + sum;
        valueCache.set(nodeId, value);
        return value;
      };

      // 그룹 내의 모든 노드에 대해 값 계산
      groupIds.forEach(circleId => {
        const circle = circlesWithValues.find(c => c.id === circleId);
        if (circle) {
          circle.value = calculateValue(circleId);
        }
      });
    });

    // 그룹별로 rank 계산 후 레벨 계산
    const withRanks = calculateRanks(circlesWithValues, groups);
    return calculateLevels(withRanks, arrowsList);
  };

  // 레벨 계산 함수 (화살표 구조에서의 depth)
  const calculateLevels = (circlesList: Circle[], arrowsList: Arrow[]): Circle[] => {
    const result = circlesList.map(circle => ({
      ...circle,
      level: 0,
      x: circle.x ?? 0,
      y: circle.y ?? 0,
      radius: circle.radius ?? 55
    }));
    const levelMap = new Map<number, number>();

    // 들어오는 화살표가 없는 노드들을 루트로 설정 (레벨 0)
    const hasIncoming = new Set(arrowsList.map(a => a.to));
    const roots = circlesList.filter(c => !hasIncoming.has(c.id)).map(c => c.id);

    // BFS로 레벨 계산
    const queue: number[] = [];
    roots.forEach(id => {
      levelMap.set(id, 0);
      queue.push(id);
    });

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentLevel = levelMap.get(currentId)!;

      // 현재 노드에서 나가는 화살표들 찾기
      const outgoing = arrowsList.filter(a => a.from === currentId);

      outgoing.forEach(arrow => {
        const targetId = arrow.to;
        const existingLevel = levelMap.get(targetId);

        // 더 깊은 레벨로 업데이트 (여러 경로가 있을 수 있음)
        if (existingLevel === undefined || existingLevel < currentLevel + 1) {
          levelMap.set(targetId, currentLevel + 1);
          queue.push(targetId);
        }
      });
    }

    // 결과에 레벨 적용
    result.forEach(circle => {
      circle.level = levelMap.get(circle.id) ?? 0;
    });

    return result;
  };

  // rank 계산 함수 (그룹별로 독립적으로 계산, 스포츠 순위 방식)
  const calculateRanks = (circlesList: Circle[], groups: Map<number, number[]>): Circle[] => {
    const result = circlesList.map(circle => ({
      ...circle,
      x: circle.x ?? 0,
      y: circle.y ?? 0,
      radius: circle.radius ?? 55
    }));

    // 각 그룹별로 독립적으로 rank 계산
    groups.forEach((groupIds) => {
      // 그룹에 속한 circle들만 필터링
      const groupCircles = result.filter(c => groupIds.includes(c.id));

      // value를 기준으로 정렬 (오름차순)
      const sortedValues = [...groupCircles].sort((a, b) => a.value - b.value);

      // 각 value에 대한 rank 매핑 생성
      const valueToRank = new Map<number, number>();
      let currentRank = 1;

      for (let i = 0; i < sortedValues.length; i++) {
        const currentValue = sortedValues[i].value;

        // 이미 rank가 부여된 값이 아니면 새로 부여
        if (!valueToRank.has(currentValue)) {
          valueToRank.set(currentValue, currentRank);
        }

        // 다음 원소가 다른 값이면 rank를 현재 인덱스+2로 업데이트
        if (i < sortedValues.length - 1 && sortedValues[i + 1].value !== currentValue) {
          currentRank = i + 2; // 1-based index이므로 i+2
        }
      }

      // 그룹 내 각 circle에 rank 부여
      groupCircles.forEach(circle => {
        const circleInResult = result.find(c => c.id === circle.id);
        if (circleInResult) {
          circleInResult.rank = valueToRank.get(circle.value) || 1;
        }
      });
    });

    return result;
  };

  const addCircle = (x?: number, y?: number) => {
    const newCircle: Circle = {
      id: nextCircleId,
      x: x ?? Math.random() * (window.innerWidth - 200) + 100,
      y: y ?? Math.random() * (window.innerHeight - 200) + 100,
      radius: 55,
      color: COLORS[nextCircleId % COLORS.length],
      name: '',
      value: 0,
      rank: 1,
      level: 0,
    };
    const updatedCircles = [...circles, newCircle];
    setCircles(calculateNodeValues(updatedCircles, arrows));
    setNextCircleId(nextCircleId + 1);
  };

  const handleDoubleClick = (circleId: number) => {
    const circle = circles.find((c) => c.id === circleId);
    if (!circle) return;

    setEditingCircleId(circleId);
    setEditingName(circle.name);
  };

  const handleNameChange = (value: string) => {
    setEditingName(value);
  };

  const handleNameSubmit = () => {
    if (editingCircleId !== null) {
      setCircles(
        circles.map((circle) =>
          circle.id === editingCircleId
            ? { ...circle, name: editingName }
            : circle
        )
      );
      setEditingCircleId(null);
      setEditingName('');
    }
  };

  const handleCircleClick = (circleId: number) => {
    if (!arrowMode) return;

    if (selectedCircleForArrow === null) {
      // 첫 번째 원 선택
      setSelectedCircleForArrow(circleId);
    } else {
      // ��� 번째 원 선택 - 화살표 추가
      if (selectedCircleForArrow !== circleId) {
        // 같은 원이 아닐 때만 추가
        setArrows((prevArrows) => {
          const existingArrow = prevArrows.find(
            (arrow) =>
              (arrow.from === selectedCircleForArrow && arrow.to === circleId) ||
              (arrow.from === circleId && arrow.to === selectedCircleForArrow)
          );

          if (!existingArrow) {
            const updatedArrows = [...prevArrows, { id: nextArrowId, from: selectedCircleForArrow, to: circleId }];
            setNextArrowId(nextArrowId + 1);
            // 화살표가 추가되면 노드값 재계산
            setCircles((prevCircles) => calculateNodeValues(prevCircles, updatedArrows));
            return updatedArrows;
          }
          return prevArrows;
        });
      }
      setSelectedCircleForArrow(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, circleId: number) => {
    // Cmd/Ctrl + 드래그로 화살표 그리기 모드
    if (e.metaKey || e.ctrlKey) {
      const circle = circles.find((c) => c.id === circleId);
      if (!circle) return;

      setDrawingArrow({
        fromId: circleId,
        x: e.clientX,
        y: e.clientY,
      });
      return;
    }

    if (arrowMode) {
      handleCircleClick(circleId);
      return;
    }

    const circle = circles.find((c) => c.id === circleId);
    if (!circle) return;

    setDraggedCircleId(circleId);
    dragOffset.current = {
      x: e.clientX - circle.x,
      y: e.clientY - circle.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Cmd/Ctrl 드래그로 화살표 그리기 중
    if (drawingArrow) {
      setDrawingArrow({
        ...drawingArrow,
        x: e.clientX,
        y: e.clientY,
      });
      return;
    }

    if (draggedCircleId === null) return;

    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;

    setCircles((prevCircles) =>
      prevCircles.map((circle) =>
        circle.id === draggedCircleId
          ? { ...circle, x: newX, y: newY }
          : circle
      )
    );
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // Cmd/Ctrl 드래그로 화살표 그리기 완료
    if (drawingArrow) {
      // 마우스 위치에 있는 원 찾기
      const targetCircle = circles.find((circle) => {
        const dx = e.clientX - circle.x;
        const dy = e.clientY - circle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= circle.radius;
      });

      if (targetCircle && targetCircle.id !== drawingArrow.fromId) {
        // 타겟 원이 있고, 시작 원과 다른 경우 화살표 생성
        setArrows((prevArrows) => {
          const existingArrow = prevArrows.find(
            (arrow) =>
              (arrow.from === drawingArrow.fromId && arrow.to === targetCircle.id) ||
              (arrow.from === targetCircle.id && arrow.to === drawingArrow.fromId)
          );

          if (!existingArrow) {
            const updatedArrows = [...prevArrows, { id: nextArrowId, from: drawingArrow.fromId, to: targetCircle.id }];
            setNextArrowId(nextArrowId + 1);
            // 화살표가 추가되면 노드값 재계산
            setCircles((prevCircles) => calculateNodeValues(prevCircles, updatedArrows));
            return updatedArrows;
          }
          return prevArrows;
        });
      } else if (!targetCircle) {
        // 타겟 원이 없으면 해당 위치에 새 원 생성하고 화살표 연결
        const newCircleId = nextCircleId;
        const newCircle: Circle = {
          id: newCircleId,
          x: e.clientX,
          y: e.clientY,
          radius: 55,
          color: COLORS[newCircleId % COLORS.length],
          name: '',
          value: 0,
          rank: 0,
        };

        // 새 원과 화살표를 동시에 추가하고 노드값 재계산
        setCircles((prevCircles) => {
          const updatedCircles = [...prevCircles, newCircle];
          const newArrow = { id: nextArrowId, from: drawingArrow.fromId, to: newCircleId };
          const updatedArrows = [...arrows, newArrow];

          // 화살표 상태도 업데이트
          setArrows(updatedArrows);

          // 노드값 재계산
          return calculateNodeValues(updatedCircles, updatedArrows);
        });

        setNextCircleId(newCircleId + 1);
        setNextArrowId(nextArrowId + 1);
      }

      // 드래그가 방금 종료되었음을 표시
      justFinishedDrawing.current = true;
      setTimeout(() => {
        justFinishedDrawing.current = false;
      }, 100);

      setDrawingArrow(null);
      return;
    }

    setDraggedCircleId(null);
  };

  const handleCircleRightClick = (e: React.MouseEvent, circleId: number) => {
    e.preventDefault(); // 기본 컨텍스트 메뉴 방지

    setArrows((prevArrows) => {
      // 해당 원과 연결된 화살표들도 삭제
      const updatedArrows = prevArrows.filter(
        arrow => arrow.from !== circleId && arrow.to !== circleId
      );

      setCircles((prevCircles) => {
        // 해당 원 삭제
        const updatedCircles = prevCircles.filter(circle => circle.id !== circleId);
        return calculateNodeValues(updatedCircles, updatedArrows);
      });

      return updatedArrows;
    });

    // 선택된 원이었다면 선택 해제
    if (selectedCircleForArrow === circleId) {
      setSelectedCircleForArrow(null);
    }
  };

  const handleArrowRightClick = (e: React.MouseEvent, arrowId: number) => {
    e.preventDefault();
    e.stopPropagation();

    setArrows((prevArrows) => {
      // 해당 화살표 삭제
      const updatedArrows = prevArrows.filter((arrow) => arrow.id !== arrowId);

      setCircles((prevCircles) => calculateNodeValues(prevCircles, updatedArrows));

      return updatedArrows;
    });
  };

  // Circle 충돌 방지 - 겹치면 서로 밀어냄
  useEffect(() => {
    const separateOverlappingCircles = () => {
      setCircles(prevCircles => {
        let updated = [...prevCircles];
        let hasOverlap = false;
        const minDistance = 110; // 두 circle의 중심 사이 최소 거리 (반지름 55 * 2)
        const pushForce = 2; // 밀어내는 힘의 강도

        // 모든 circle 쌍을 확인
        for (let i = 0; i < updated.length; i++) {
          for (let j = i + 1; j < updated.length; j++) {
            const circleA = updated[i];
            const circleB = updated[j];

            const dx = circleB.x - circleA.x;
            const dy = circleB.y - circleA.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // 겹치는 경우
            if (distance < minDistance && distance > 0) {
              hasOverlap = true;

              // 정규화된 방향 벡터
              const nx = dx / distance;
              const ny = dy / distance;

              // 겹친 정도
              const overlap = minDistance - distance;

              // 각 circle을 반대 방향으로 밀어냄
              const moveDistance = (overlap / 2) * 0.5 + pushForce; // 부드러운 이동

              updated[i] = {
                ...circleA,
                x: circleA.x - nx * moveDistance,
                y: circleA.y - ny * moveDistance,
              };

              updated[j] = {
                ...circleB,
                x: circleB.x + nx * moveDistance,
                y: circleB.y + ny * moveDistance,
              };
            }
          }
        }

        return hasOverlap ? updated : prevCircles;
      });
    };

    // 주기적으로 충돌 체크 (부드러운 애니메이션)
    const intervalId = setInterval(separateOverlappingCircles, 50);

    return () => clearInterval(intervalId);
  }, [circles.length]); // circles.length가 바뀔 때만 interval 재설정

  // 초기 노드값 계산
  useEffect(() => {
    setCircles(calculateNodeValues(circles, arrows));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command/Ctrl + N으로 원 추가
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        addCircle();
      }
      // Command/Ctrl + B로 화살표 모드 토글
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setArrowMode(prev => !prev);
        setSelectedCircleForArrow(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circles, arrows, nextCircleId, nextArrowId, arrowMode]);

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // 방금 드래그가 끝났으면 무시 (중복 생성 방지)
    if (justFinishedDrawing.current) return;

    // 드래그 중이면 무시
    if (drawingArrow !== null || draggedCircleId !== null) return;

    // Cmd/Ctrl + 클릭으로만 원 생성
    if (!e.metaKey && !e.ctrlKey) return;

    // SVG나 최상위 div를 클릭한 경우 원 생성 (원이나 화살표가 아닌 경우)
    const target = e.target as HTMLElement | SVGElement;
    const tagName = target.tagName?.toLowerCase();

    // svg 또는 최상위 div를 클릭한 경우에만 원 생성
    if (tagName === 'svg' || e.target === e.currentTarget) {
      addCircle(e.clientX, e.clientY);
    }
  };

  // 키보드 네비게이션 (좌우 방향키 + 위 방향키로 자식 생성)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Up Arrow: 선택된 circle 위에 새 circle 생성 및 연결
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowUp') {
        e.preventDefault();

        if (focusedCircleId === null) return;

        const focusedCircle = circles.find(c => c.id === focusedCircleId);
        if (!focusedCircle) return;

        // 현재 circle 위에 새 circle 생성
        const newCircle: Circle = {
          id: nextCircleId,
          x: focusedCircle.x,
          y: focusedCircle.y - 150, // 위쪽에 생성
          radius: 55,
          color: COLORS[nextCircleId % COLORS.length],
          name: '',
          value: 0,
          rank: 1,
          level: 0,
        };

        // 새 화살표 생성 (focusedCircle -> newCircle)
        const newArrow: Arrow = {
          id: nextArrowId,
          from: focusedCircleId,
          to: nextCircleId,
        };

        const updatedCircles = [...circles, newCircle];
        const updatedArrows = [...arrows, newArrow];

        setCircles(calculateNodeValues(updatedCircles, updatedArrows));
        setArrows(updatedArrows);
        setNextCircleId(nextCircleId + 1);
        setNextArrowId(nextArrowId + 1);
        setFocusedCircleId(nextCircleId); // 새 circle로 포커스 이동

        return;
      }

      // Cmd/Ctrl + Down Arrow: 선택된 circle 아래에 새 circle 생성 및 연결
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowDown') {
        e.preventDefault();

        if (focusedCircleId === null) return;

        const focusedCircle = circles.find(c => c.id === focusedCircleId);
        if (!focusedCircle) return;

        // 현재 circle 아래에 새 circle 생성
        const newCircle: Circle = {
          id: nextCircleId,
          x: focusedCircle.x,
          y: focusedCircle.y + 150, // 아래쪽에 생성
          radius: 55,
          color: COLORS[nextCircleId % COLORS.length],
          name: '',
          value: 0,
          rank: 1,
          level: 0,
        };

        // 새 화살표 생성 (newCircle -> focusedCircle)
        const newArrow: Arrow = {
          id: nextArrowId,
          from: nextCircleId,
          to: focusedCircleId,
        };

        const updatedCircles = [...circles, newCircle];
        const updatedArrows = [...arrows, newArrow];

        setCircles(calculateNodeValues(updatedCircles, updatedArrows));
        setArrows(updatedArrows);
        setNextCircleId(nextCircleId + 1);
        setNextArrowId(nextArrowId + 1);
        setFocusedCircleId(nextCircleId); // 새 circle로 포커스 이동

        return;
      }

      // Cmd/Ctrl + Left/Right Arrow: 동일한 root와 end를 가지는 형제 circle 생성
      if ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();

        if (focusedCircleId === null) return;

        const focusedCircle = circles.find(c => c.id === focusedCircleId);
        if (!focusedCircle) return;

        // 현재 circle의 부모들 (incoming arrows) 찾기
        const parentArrows = arrows.filter(a => a.to === focusedCircleId);
        // 현재 circle의 자식들 (outgoing arrows) 찾기
        const childArrows = arrows.filter(a => a.from === focusedCircleId);

        // 새 circle을 좌우에 배치 (150px 간격)
        const offsetX = e.key === 'ArrowLeft' ? -150 : 150;
        const newCircle: Circle = {
          id: nextCircleId,
          x: focusedCircle.x + offsetX,
          y: focusedCircle.y,
          radius: 55,
          color: COLORS[nextCircleId % COLORS.length],
          name: '',
          value: 0,
          rank: 1,
          level: 0,
        };

        const updatedCircles = [...circles, newCircle];
        let updatedArrows = [...arrows];
        let newArrowId = nextArrowId;

        // 부모들과 연결
        parentArrows.forEach(arrow => {
          updatedArrows.push({
            id: newArrowId,
            from: arrow.from,
            to: nextCircleId,
          });
          newArrowId++;
        });

        // 자식들과 연결
        childArrows.forEach(arrow => {
          updatedArrows.push({
            id: newArrowId,
            from: nextCircleId,
            to: arrow.to,
          });
          newArrowId++;
        });

        setCircles(calculateNodeValues(updatedCircles, updatedArrows));
        setArrows(updatedArrows);
        setNextCircleId(nextCircleId + 1);
        setNextArrowId(newArrowId);
        setFocusedCircleId(nextCircleId); // 새 circle로 포커스 이동

        return;
      }

      // 현재 포커스된 circle이 없으면 무시
      if (focusedCircleId === null) return;

      // 좌우 방향키가 아니면 무시
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

      const focusedCircle = circles.find(c => c.id === focusedCircleId);
      if (!focusedCircle) return;

      // 같은 레벨의 circle들 찾기
      const sameLevelCircles = circles.filter(c => c.level === focusedCircle.level);

      // 레벨에 circle이 하나만 있으면 무시
      if (sameLevelCircles.length <= 1) return;

      // x 좌표 기준으로 정렬
      const sorted = [...sameLevelCircles].sort((a, b) => a.x - b.x);
      const currentIndex = sorted.findIndex(c => c.id === focusedCircleId);

      if (e.key === 'ArrowLeft') {
        // 왼쪽으로 이동
        const newIndex = currentIndex > 0 ? currentIndex - 1 : sorted.length - 1;
        setFocusedCircleId(sorted[newIndex].id);
      } else if (e.key === 'ArrowRight') {
        // 오른쪽으로 이동
        const newIndex = currentIndex < sorted.length - 1 ? currentIndex + 1 : 0;
        setFocusedCircleId(sorted[newIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedCircleId, circles, arrows, nextCircleId, nextArrowId]);

  return (
    <div
      className="w-full h-screen overflow-hidden relative transition-all duration-300"
      style={{ backgroundColor: 'var(--background)' }}
      onMouseMove={handleMouseMove}
      onMouseUp={(e) => handleMouseUp(e as unknown as React.MouseEvent)}
      onMouseLeave={(e) => handleMouseUp(e as unknown as React.MouseEvent)}
      onClick={handleBackgroundClick}
    >
      {/* SVG for arrows - positioned behind circles */}
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {arrows.map((arrow, index) => {
          const fromCircle = getCircleById(arrow.from);
          const toCircle = getCircleById(arrow.to);

          if (!fromCircle || !toCircle) return null;

          const { startX, startY, endX, endY, angle } = calculateArrowPath(fromCircle, toCircle);
          const arrowhead = createArrowhead(endX, endY, angle);

          return (
            <g
              key={arrow.id}
              onContextMenu={(e) => handleArrowRightClick(e, arrow.id)}
            >
              {/* 투명한 넓은 영역으로 클릭 영역 확대 */}
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke="transparent"
                strokeWidth="30"
                style={{ cursor: 'pointer' }}
                pointerEvents="all"
              />
              <motion.line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke="var(--border-dark)"
                strokeWidth="3"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1, delay: index * 0.1, ease: "easeInOut" }}
                pointerEvents="none"
              />
              <motion.path
                d={arrowhead}
                stroke="var(--border-dark)"
                strokeWidth="3"
                fill="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 + 0.5, ease: "easeInOut" }}
                pointerEvents="none"
              />
            </g>
          );
        })}

        {/* Cmd/Ctrl 드래그 중인 점선 화살표 */}
        {drawingArrow && (() => {
          const fromCircle = getCircleById(drawingArrow.fromId);
          if (!fromCircle) return null;

          const dx = drawingArrow.x - fromCircle.x;
          const dy = drawingArrow.y - fromCircle.y;
          const angle = Math.atan2(dy, dx);

          const startX = fromCircle.x + Math.cos(angle) * fromCircle.radius;
          const startY = fromCircle.y + Math.sin(angle) * fromCircle.radius;

          return (
            <g>
              <line
                x1={startX}
                y1={startY}
                x2={drawingArrow.x}
                y2={drawingArrow.y}
                stroke="var(--border-dark)"
                strokeWidth="3"
                strokeDasharray="8,5"
                pointerEvents="none"
              />
              <path
                d={createArrowhead(drawingArrow.x, drawingArrow.y, angle)}
                stroke="var(--border-dark)"
                strokeWidth="3"
                fill="none"
                pointerEvents="none"
              />
            </g>
          );
        })()}

        {/* Focused circle indicator (dashed border) */}
        {focusedCircleId !== null && (() => {
          const focusedCircle = circles.find(c => c.id === focusedCircleId);
          if (!focusedCircle) return null;

          const borderRadius = focusedCircle.radius + 8;
          return (
            <motion.circle
              key={`focus-${focusedCircleId}`}
              cx={focusedCircle.x}
              cy={focusedCircle.y}
              r={borderRadius}
              stroke="var(--foreground)"
              strokeWidth="4"
              strokeDasharray="12 8"
              fill="none"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
          );
        })()}
      </svg>

      {/* Circles - positioned above arrows */}
      <div className="absolute inset-0" style={{ zIndex: 2, pointerEvents: 'none' }}>
        {circles.filter(c => !isNaN(c.x) && !isNaN(c.y) && !isNaN(c.radius)).map((circle, index) => (
          <motion.div
            key={circle.id}
            className={`absolute rounded-full flex items-center justify-center ${
              arrowMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
            } ${selectedCircleForArrow === circle.id ? 'ring-4' : ''}`}
            style={{
              ...(selectedCircleForArrow === circle.id && { ringColor: 'var(--foreground)' }),
              left: circle.x - circle.radius,
              top: circle.y - circle.radius,
              width: circle.radius * 2,
              height: circle.radius * 2,
              backgroundColor: circle.color,
              pointerEvents: 'auto',
              border: '3px solid var(--border)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            transition={{
              scale: { duration: 0.5, delay: index * 0.1, ease: "easeOut" },
              opacity: { duration: 0.5, delay: index * 0.1, ease: "easeOut" },
            }}
            whileHover={
              draggedCircleId === null
                ? {
                    scale: 1.05,
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
                    transition: { duration: 0.3, ease: "easeInOut" }
                  }
                : {}
            }
            onMouseDown={(e) => handleMouseDown(e, circle.id)}
            onDoubleClick={() => handleDoubleClick(circle.id)}
            onContextMenu={(e) => handleCircleRightClick(e, circle.id)}
            onClick={(e) => {
              e.stopPropagation();
              if (!arrowMode && !draggedCircleId) {
                setFocusedCircleId(circle.id);
              }
            }}
          >
            <div className="flex flex-col items-center justify-center gap-0.5">
              {editingCircleId === circle.id ? (
                <Input
                  value={editingName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onBlur={handleNameSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleNameSubmit();
                    } else if (e.key === 'Escape') {
                      setEditingCircleId(null);
                      setEditingName('');
                    }
                  }}
                  autoFocus
                  className="w-20 h-8 text-center text-sm p-1 border-2"
                  style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)', borderColor: 'var(--background)' }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span className="select-none text-xs" style={{ color: '#F5E6D3', opacity: 0.8, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.1em' }}>
                    #{circle.rank}
                  </span>
                  <span className="select-none font-bold text-2xl" style={{ color: '#F5E6D3', fontFamily: 'League Spartan, sans-serif', letterSpacing: '0.05em' }}>
                    {circle.value}
                  </span>
                  {circle.name && (
                    <span className="text-xs select-none px-2 text-center break-words max-w-full uppercase" style={{ color: '#F5E6D3', opacity: 0.9, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.08em' }}>
                      {circle.name}
                    </span>
                  )}
                </>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Control panel */}
      <div className="absolute top-8 left-8 flex flex-col gap-5" style={{ zIndex: 3 }}>
        {/* Input fields */}
        <div className="flex items-center gap-3 p-4 rounded-full border-3" style={{ backgroundColor: '#2C231F', borderColor: 'rgba(245, 230, 211, 0.3)' }}>
          <Input
            placeholder="START"
            className="border-2 uppercase"
            style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)', borderColor: 'var(--background)', letterSpacing: '0.08em' }}
          />
          <ArrowRight className="w-5 h-5 flex-shrink-0" style={{ color: '#F5E6D3' }} />
          <Input
            placeholder="END"
            className="border-2 uppercase"
            style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)', borderColor: 'var(--background)', letterSpacing: '0.08em' }}
          />
        </div>

        <Button
          onClick={addCircle}
          className="gap-2 rounded-full py-6 uppercase transition-all duration-300 hover:scale-105"
          style={{
            backgroundColor: 'var(--foreground)',
            color: 'var(--background)',
            border: '3px solid var(--border-dark)',
            letterSpacing: '0.08em',
            fontWeight: 700
          }}
        >
          <Plus className="w-5 h-5" />
          ADD CIRCLE
          <span className="text-xs ml-1" style={{ opacity: 0.6 }}>(⌘N)</span>
        </Button>

        {/* 화살표 모드 토글 */}
        <div className="flex items-center gap-4 p-4 rounded-full border-3" style={{ backgroundColor: '#2C231F', borderColor: 'rgba(245, 230, 211, 0.3)' }}>
          <Switch
            id="arrow-mode"
            checked={arrowMode}
            onCheckedChange={(checked) => {
              setArrowMode(checked);
              setSelectedCircleForArrow(null);
            }}
          />
          <Label
            htmlFor="arrow-mode"
            className="cursor-pointer flex items-center gap-2 uppercase"
                  style={{ color: 'var(--foreground)', letterSpacing: '0.08em', fontWeight: 700 }}
          >
            <GitBranch className="w-4 h-4" />
            <span>ARROW MODE</span>
            {arrowMode && (
              <span className="text-xs px-3 py-1 rounded-full uppercase" style={{ backgroundColor: '#F5E6D3', color: '#3D2F2A', fontWeight: 700 }}>ON</span>
            )}
            <span className="text-xs" style={{ opacity: 0.6 }}>(⌘B)</span>
          </Label>
        </div>

        {arrowMode && (
          <p className="text-sm p-4 rounded-full uppercase border-3" style={{
            color: 'var(--foreground)',
            backgroundColor: 'var(--panel)',
            borderColor: 'var(--panel-border)',
            letterSpacing: '0.08em',
            fontFamily: 'IBM Plex Mono, monospace'
          }}>
            {selectedCircleForArrow === null
              ? 'SELECT FIRST CIRCLE'
              : 'SELECT SECOND CIRCLE'}
          </p>
        )}
      </div>

      {/* Circle Details Panel */}
      {focusedCircleId !== null && (() => {
        const selectedCircle = circles.find(c => c.id === focusedCircleId);
        if (!selectedCircle) return null;

        // 연결된 화살표 찾기
        const outgoingArrows = arrows.filter(a => a.from === focusedCircleId);
        const incomingArrows = arrows.filter(a => a.to === focusedCircleId);

        return (
          <div className="absolute top-8 right-8 w-96" style={{ zIndex: 3 }}>
            <Card className="shadow-2xl border-3 rounded-3xl" style={{
              backgroundColor: 'var(--panel)',
              borderColor: 'var(--border)',
            }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                <CardTitle className="text-2xl uppercase" style={{
                  color: 'var(--foreground)',
                  fontFamily: 'League Spartan, sans-serif',
                  letterSpacing: '0.1em',
                  fontWeight: 800
                }}>CIRCLE DETAILS</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFocusedCircleId(null)}
                  className="h-10 w-10 rounded-full transition-all duration-300"
                  style={{
                    color: 'var(--foreground)',
                    '--hover-bg': 'var(--foreground)',
                    '--hover-text': 'var(--background)'
                  } as React.CSSProperties}
                >
                  <X className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* ID */}
                <div className="space-y-2">
                  <Label className="uppercase" style={{ color: 'rgba(245, 230, 211, 0.6)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>ID</Label>
                  <div className="text-xl" style={{ color: '#F5E6D3', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.05em' }}>#{selectedCircle.id}</div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label className="uppercase" style={{ color: 'rgba(245, 230, 211, 0.6)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>NAME</Label>
                  <Input
                    value={selectedCircle.name}
                    onChange={(e) => {
                      setCircles(circles.map(c =>
                        c.id === focusedCircleId
                          ? { ...c, name: e.target.value }
                          : c
                      ));
                    }}
                    placeholder="ENTER NAME..."
                    className="text-lg uppercase border-2 rounded-xl"
                    style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)', letterSpacing: '0.05em' }}
                  />
                </div>

                {/* Color */}
                <div className="space-y-2">
                  <Label className="uppercase" style={{ color: 'rgba(245, 230, 211, 0.6)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>COLOR</Label>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-14 h-14 rounded-full border-3"
                      style={{ backgroundColor: selectedCircle.color, borderColor: 'rgba(245, 230, 211, 0.4)' }}
                    />
                    <Input
                      type="text"
                      value={selectedCircle.color}
                      onChange={(e) => {
                        setCircles(circles.map(c =>
                          c.id === focusedCircleId
                            ? { ...c, color: e.target.value }
                            : c
                        ));
                      }}
                      className="flex-1 border-2 rounded-xl"
                      style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--panel-border)', letterSpacing: '0.05em', fontFamily: 'IBM Plex Mono, monospace' }}
                    />
                  </div>
                </div>

                {/* Node Value */}
                <div className="space-y-2">
                  <Label className="uppercase" style={{ color: 'rgba(245, 230, 211, 0.6)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>NODE VALUE</Label>
                  <div className="text-3xl" style={{ color: '#F5E6D3', fontFamily: 'League Spartan, sans-serif', fontWeight: 800, letterSpacing: '0.05em' }}>{selectedCircle.value}</div>
                  <p className="text-xs uppercase" style={{ color: 'rgba(245, 230, 211, 0.5)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.05em' }}>
                    (CHILDREN COUNT + VALUES SUM)
                  </p>
                </div>

                {/* Rank */}
                <div className="space-y-2">
                  <Label className="uppercase" style={{ color: 'rgba(245, 230, 211, 0.6)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>RANK</Label>
                  <div className="text-3xl" style={{ color: '#F5E6D3', fontFamily: 'League Spartan, sans-serif', fontWeight: 800, letterSpacing: '0.05em' }}>#{selectedCircle.rank}</div>
                  <p className="text-xs uppercase" style={{ color: 'rgba(245, 230, 211, 0.5)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.05em' }}>
                    GROUP RANKING
                  </p>
                </div>

                {/* Level */}
                <div className="space-y-2">
                  <Label className="uppercase" style={{ color: 'rgba(245, 230, 211, 0.6)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>LEVEL</Label>
                  <div className="text-3xl" style={{ color: '#F5E6D3', fontFamily: 'League Spartan, sans-serif', fontWeight: 800, letterSpacing: '0.05em' }}>{selectedCircle.level}</div>
                  <p className="text-xs uppercase" style={{ color: 'rgba(245, 230, 211, 0.5)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.05em' }}>
                    ARROW DEPTH
                  </p>
                </div>

                {/* Position */}
                <div className="space-y-2">
                  <Label className="uppercase" style={{ color: 'rgba(245, 230, 211, 0.6)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>POSITION</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border-2" style={{ backgroundColor: '#3D2F2A', borderColor: 'rgba(245, 230, 211, 0.2)' }}>
                      <span className="text-xs uppercase block" style={{ color: 'rgba(245, 230, 211, 0.5)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.05em' }}>X</span>
                      <span className="text-lg" style={{ color: '#F5E6D3', fontFamily: 'IBM Plex Mono, monospace' }}>{Math.round(selectedCircle.x)}</span>
                    </div>
                    <div className="p-3 rounded-xl border-2" style={{ backgroundColor: '#3D2F2A', borderColor: 'rgba(245, 230, 211, 0.2)' }}>
                      <span className="text-xs uppercase block" style={{ color: 'rgba(245, 230, 211, 0.5)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.05em' }}>Y</span>
                      <span className="text-lg" style={{ color: '#F5E6D3', fontFamily: 'IBM Plex Mono, monospace' }}>{Math.round(selectedCircle.y)}</span>
                    </div>
                  </div>
                </div>

                {/* Connections */}
                <div className="space-y-2">
                  <Label className="uppercase" style={{ color: 'rgba(245, 230, 211, 0.6)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>CONNECTIONS</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-xl border-2" style={{ backgroundColor: '#3D2F2A', borderColor: 'rgba(245, 230, 211, 0.2)' }}>
                      <span className="text-sm uppercase" style={{ color: 'rgba(245, 230, 211, 0.7)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.05em' }}>OUTGOING</span>
                      <span className="text-lg" style={{ color: '#F5E6D3', fontFamily: 'League Spartan, sans-serif', fontWeight: 700 }}>{outgoingArrows.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl border-2" style={{ backgroundColor: '#3D2F2A', borderColor: 'rgba(245, 230, 211, 0.2)' }}>
                      <span className="text-sm uppercase" style={{ color: 'rgba(245, 230, 211, 0.7)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.05em' }}>INCOMING</span>
                      <span className="text-lg" style={{ color: '#F5E6D3', fontFamily: 'League Spartan, sans-serif', fontWeight: 700 }}>{incomingArrows.length}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4" style={{ borderColor: 'rgba(245, 230, 211, 0.2)' }} />

                {/* Actions */}
                <div className="space-y-2">
                  <Button
                    className="w-full rounded-full py-6 uppercase transition-all duration-300 hover:scale-105"
                    style={{
                      backgroundColor: '#d4183d',
                      color: 'var(--foreground)',
                      border: '3px solid rgba(212, 24, 61, 0.5)',
                      letterSpacing: '0.08em',
                      fontWeight: 700
                    }}
                    onClick={(e) => {
                      handleCircleRightClick(e as any, focusedCircleId);
                      setFocusedCircleId(null);
                    }}
                  >
                    DELETE CIRCLE
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}
    </div>
  );
}
