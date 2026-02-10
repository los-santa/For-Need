import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Switch } from './components/ui/switch';
import { Label } from './components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Slider } from './components/ui/slider';
import { Textarea } from './components/ui/textarea';
import { Checkbox } from './components/ui/checkbox';
import { Plus, GitBranch, ArrowRight, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Settings } from 'lucide-react';
import { NotesPanel } from './components/NotesPanel';

interface Circle {
  id: number;
  project_id: string | null;
  title: string;
  content: string | null;
  cardtype: number | null;
  complete: number;
  activate: number;
  duration: number | null;
  es: string | null;
  ls: string | null;
  startdate: string | null;
  enddate: string | null;
  price: number | null;
  createdat: string;
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
  label: string;
}

const COLORS = ['#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000'];

export default function App() {
  const [circles, setCircles] = useState<Circle[]>([]);

  const [draggedCircleId, setDraggedCircleId] = useState<number | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const justFinishedDrawing = useRef(false);
  const mouseDownPosition = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);
  
  const [arrowMode, setArrowMode] = useState(false);
  const [selectedCircleForArrow, setSelectedCircleForArrow] = useState<number | null>(null);
  const [nextCircleId, setNextCircleId] = useState(1);
  const [nextArrowId, setNextArrowId] = useState(1);
  
  const [editingCircleId, setEditingCircleId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const prevEditingCircleId = useRef<number | null>(null);
  const editingNameRef = useRef<string>('');
  
  const [editingArrowId, setEditingArrowId] = useState<number | null>(null);
  const [editingArrowLabel, setEditingArrowLabel] = useState('');
  const prevEditingArrowId = useRef<number | null>(null);
  const editingArrowLabelRef = useRef<string>('');
  
  const [focusedCircleId, setFocusedCircleId] = useState<number | null>(null);
  
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);
  const [controlPanelOpen, setControlPanelOpen] = useState(true);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  const [arrows, setArrows] = useState<Arrow[]>([]);
  
  // Cmd/Ctrl + 드래그로 화살표 그리기
  const [drawingArrow, setDrawingArrow] = useState<{ fromId: number; x: number; y: number } | null>(null);

  // 확대/축소 및 패닝 상태
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Hover tooltip 상태
  const [hoveredCircleId, setHoveredCircleId] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const hoverTimer = useRef<number | null>(null);

  // Relationship panel 상태
  const [startTitle, setStartTitle] = useState('');
  const [endTitle, setEndTitle] = useState('');

  // Settings 상태
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(() => {
    const saved = localStorage.getItem('showDeleteConfirmation');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [autoTrackFocusedNode, setAutoTrackFocusedNode] = useState(() => {
    const saved = localStorage.getItem('autoTrackFocusedNode');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showArrowLabels, setShowArrowLabels] = useState(() => {
    const saved = localStorage.getItem('showArrowLabels');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // DB 관련 상태
  const [currentDbPath, setCurrentDbPath] = useState<string | null>(null);
  const [dbPath, setDbPath] = useState<string | null>(null);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  
  // 관계타입 필터링 상태
  const [relationTypes, setRelationTypes] = useState<Array<{ relationtype_id: number; typename: string }>>([]);
  const [selectedRelationTypeIds, setSelectedRelationTypeIds] = useState<number[] | null>(null); // null = 전체 선택
  const selectedRelationTypeIdsRef = useRef<number[] | null>(null);

  // Delete confirmation dialog 상태
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    circleId: number;
    circleName: string;
  } | null>(null);

  // Auto-layout 상태
  const [autoLayoutEnabled, setAutoLayoutEnabled] = useState(true);
  const animationFrameRef = useRef<number | null>(null);

  const getCircleById = (id: number) => circles.find((c) => c.id === id);

  // 화면 좌표를 월드 좌표로 변환
  const screenToWorld = (screenX: number, screenY: number) => {
    return {
      x: (screenX - pan.x) / zoom,
      y: (screenY - pan.y) / zoom
    };
  };

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

  // 겹치지 않는 위치 찾기 (최소 간격: 130px = radius*2 + 여유)
  const findNonOverlappingPosition = (targetX: number, targetY: number, minDistance = 130): { x: number; y: number } => {
    let x = targetX;
    let y = targetY;
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
      const hasOverlap = circles.some(circle => {
        const dx = circle.x - x;
        const dy = circle.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < minDistance;
      });
      
      if (!hasOverlap) {
        return { x, y };
      }
      
      // 겹치면 spiral 패턴으로 새 위치 시도
      const angle = (attempts * Math.PI * 0.5); // 90도씩 회전
      const offset = Math.floor(attempts / 4) * 30 + 30; // 점점 멀리
      x = targetX + Math.cos(angle) * offset;
      y = targetY + Math.sin(angle) * offset;
      attempts++;
    }
    
    // 최대 시도 후에도 겹치면 원래 위치 반환
    return { x: targetX, y: targetY };
  };

  const addCircle = (x?: number, y?: number) => {
    const newCircle: Circle = {
      id: nextCircleId,
      project_id: null,
      title: '',
      content: null,
      cardtype: null,
      complete: 0,
      activate: 0,
      duration: null,
      es: null,
      ls: null,
      startdate: null,
      enddate: null,
      price: null,
      createdat: new Date().toISOString(),
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
    
    // 새 circle로 포커싱
    setFocusedCircleId(nextCircleId);
    
    // 새 circle의 이름 편집 모드로 진입
    setEditingCircleId(nextCircleId);
    setEditingName('');
    editingNameRef.current = '';
  };

  const handleDoubleClick = (circleId: number) => {
    const circle = circles.find((c) => c.id === circleId);
    if (!circle) return;
    
    setEditingCircleId(circleId);
    setEditingName(circle.name);
    editingNameRef.current = circle.name;
  };

  const handleNameChange = (value: string) => {
    setEditingName(value);
    editingNameRef.current = value; // ref도 업데이트
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

  // editingCircleId가 변경될 때 이전 편집 내용을 자동 저장
  useEffect(() => {
    // 이전에 편집 중이던 circle이 있고, 현재 편집 중인 circle이 다른 경우
    if (prevEditingCircleId.current !== null && prevEditingCircleId.current !== editingCircleId) {
      // 이전 편집 내용을 저장 (ref의 최신 값 사용)
      setCircles(prevCircles =>
        prevCircles.map((circle) =>
          circle.id === prevEditingCircleId.current
            ? { ...circle, name: editingNameRef.current }
            : circle
        )
      );
    }
    
    // editingCircleId가 변경되면 해당 circle의 이름을 editingName에 설정
    if (editingCircleId !== null) {
      const circle = circles.find(c => c.id === editingCircleId);
      if (circle) {
        setEditingName(circle.name);
        editingNameRef.current = circle.name;
      }
    } else {
      // 편집 모드를 완전히 종료할 때도 editingName 초기화
      setEditingName('');
      editingNameRef.current = '';
    }
    
    // 현재 editingCircleId를 ref에 저장
    prevEditingCircleId.current = editingCircleId;
  }, [editingCircleId, circles]);

  // editingArrowId가 변경될 때 이전 편집 내용을 자동 저장
  useEffect(() => {
    // 이전에 편집 중이던 arrow가 있고, 현재 편집 중인 arrow가 다른 경우
    if (prevEditingArrowId.current !== null && prevEditingArrowId.current !== editingArrowId) {
      // 이전 편집 내용을 저장 (ref의 최신 값 사용)
      setArrows(prevArrows =>
        prevArrows.map((arrow) =>
          arrow.id === prevEditingArrowId.current
            ? { ...arrow, label: editingArrowLabelRef.current }
            : arrow
        )
      );
    }
    
    // editingArrowId가 변경되면 해당 arrow의 label을 editingArrowLabel에 설정
    if (editingArrowId !== null) {
      const arrow = arrows.find(a => a.id === editingArrowId);
      if (arrow) {
        setEditingArrowLabel(arrow.label);
        editingArrowLabelRef.current = arrow.label;
      }
    } else {
      // 편집 모드를 완전히 종료할 때도 editingArrowLabel 초기화
      setEditingArrowLabel('');
      editingArrowLabelRef.current = '';
    }
    
    // 현재 editingArrowId를 ref에 저장
    prevEditingArrowId.current = editingArrowId;
  }, [editingArrowId, arrows]);

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
            const updatedArrows = [...prevArrows, { id: nextArrowId, from: selectedCircleForArrow, to: circleId, label: '' }];
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
    // 스페이스바 눌린 상태면 패닝 모드
    if (isSpacePressed) {
      return; // circle 드래그 방지
    }
    
    // 마우스 다운 위치 저장
    mouseDownPosition.current = { x: e.clientX, y: e.clientY };
    hasDragged.current = false;
    
    // Cmd/Ctrl + 드래그로 화살표 그리기 모드
    if (e.metaKey || e.ctrlKey) {
      const circle = circles.find((c) => c.id === circleId);
      if (!circle) return;
      
      const worldPos = screenToWorld(e.clientX, e.clientY);
      setDrawingArrow({
        fromId: circleId,
        x: worldPos.x,
        y: worldPos.y,
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
    const worldPos = screenToWorld(e.clientX, e.clientY);
    dragOffset.current = {
      x: worldPos.x - circle.x,
      y: worldPos.y - circle.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 패닝 중
    if (isPanning) {
      const deltaX = e.clientX - panStart.current.x;
      const deltaY = e.clientY - panStart.current.y;
      setPan({ x: pan.x + deltaX, y: pan.y + deltaY });
      panStart.current = { x: e.clientX, y: e.clientY };
      return;
    }
    
    // Cmd/Ctrl 드래그로 화살표 그리기 중
    if (drawingArrow) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      setDrawingArrow({
        ...drawingArrow,
        x: worldPos.x,
        y: worldPos.y,
      });
      return;
    }
    
    if (draggedCircleId === null) return;

    // 드래그 감지: 5px 이상 이동하면 드래그로 간주
    const dx = e.clientX - mouseDownPosition.current.x;
    const dy = e.clientY - mouseDownPosition.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5) {
      hasDragged.current = true;
    }

    const worldPos = screenToWorld(e.clientX, e.clientY);
    const newX = worldPos.x - dragOffset.current.x;
    const newY = worldPos.y - dragOffset.current.y;

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
      const worldPos = screenToWorld(e.clientX, e.clientY);
      
      // 마우스 위치에 있는 원 찾기
      const targetCircle = circles.find((circle) => {
        const dx = worldPos.x - circle.x;
        const dy = worldPos.y - circle.y;
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
            const updatedArrows = [...prevArrows, { id: nextArrowId, from: drawingArrow.fromId, to: targetCircle.id, label: '' }];
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
          project_id: null,
          title: '',
          content: null,
          cardtype: null,
          complete: 0,
          activate: 0,
          duration: null,
          es: null,
          ls: null,
          startdate: null,
          enddate: null,
          price: null,
          createdat: new Date().toISOString(),
          x: worldPos.x,
          y: worldPos.y,
          radius: 55,
          color: COLORS[newCircleId % COLORS.length],
          name: '',
          value: 0,
          rank: 0,
          level: 0,
        };
        
        // 새 원과 화살표를 동시에 추가하고 노드값 재계산
        setCircles((prevCircles) => {
          const updatedCircles = [...prevCircles, newCircle];
          const newArrow = { id: nextArrowId, from: drawingArrow.fromId, to: newCircleId, label: '' };
          const updatedArrows = [...arrows, newArrow];
          
          // 화살표 상태도 업데이트
          setArrows(updatedArrows);
          
          // 노드값 재계산
          return calculateNodeValues(updatedCircles, updatedArrows);
        });
        
        setNextCircleId(newCircleId + 1);
        setNextArrowId(nextArrowId + 1);
        
        // 새 circle의 이름 편집 모드로 진입
        setEditingCircleId(newCircleId);
        setEditingName('');
        editingNameRef.current = '';
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

  // Title 기반 관계 추가
  const handleAddRelationship = (clearField?: 'start' | 'end') => {
    if (!startTitle.trim() || !endTitle.trim()) {
      return; // 빈 입력은 무시
    }

    let updatedCircles = [...circles];
    let newNextCircleId = nextCircleId;
    let newNextArrowId = nextArrowId;

    // Start circle 찾기 또는 생성
    let startCircle = updatedCircles.find(c => c.name.toLowerCase() === startTitle.trim().toLowerCase());
    if (!startCircle) {
      startCircle = {
        id: newNextCircleId,
        project_id: null,
        title: '',
        content: null,
        cardtype: null,
        complete: 0,
        activate: 0,
        duration: null,
        es: null,
        ls: null,
        startdate: null,
        enddate: null,
        price: null,
        createdat: new Date().toISOString(),
        x: Math.random() * 400 - 200,
        y: Math.random() * 400 - 200,
        name: startTitle.trim(),
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        value: 0,
        rank: 0,
        level: 0,
      };
      updatedCircles.push(startCircle);
      newNextCircleId++;
    }

    // End circle 찾기 또는 생성
    let endCircle = updatedCircles.find(c => c.name.toLowerCase() === endTitle.trim().toLowerCase());
    if (!endCircle) {
      endCircle = {
        id: newNextCircleId,
        project_id: null,
        title: '',
        content: null,
        cardtype: null,
        complete: 0,
        activate: 0,
        duration: null,
        es: null,
        ls: null,
        startdate: null,
        enddate: null,
        price: null,
        createdat: new Date().toISOString(),
        x: startCircle.x + 200,
        y: startCircle.y,
        name: endTitle.trim(),
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        value: 0,
        rank: 0,
        level: 0,
      };
      updatedCircles.push(endCircle);
      newNextCircleId++;
    }

    // 화살표 추가 (중복 체크)
    const arrowExists = arrows.some(a => a.from === startCircle.id && a.to === endCircle.id);
    if (!arrowExists) {
      const newArrow: Arrow = {
        id: newNextArrowId,
        from: startCircle.id,
        to: endCircle.id,
        label: '',
      };
      const updatedArrows = [...arrows, newArrow];
      
      // State 업데이트
      setArrows(updatedArrows);
      setCircles(calculateNodeValues(updatedCircles, updatedArrows));
      setNextArrowId(newNextArrowId + 1);
    } else {
      // 화살표는 없지만 circle이 새로 생성된 경우
      setCircles(calculateNodeValues(updatedCircles, arrows));
    }

    setNextCircleId(newNextCircleId);

    // 입력 필드 초기화 - 커서가 있는 칸만 비우기
    if (clearField === 'start') {
      setStartTitle('');
    } else if (clearField === 'end') {
      setEndTitle('');
    }
  };

  const handleCircleRightClick = (e: React.MouseEvent, circleId: number) => {
    e.preventDefault(); // 기본 컨텍스트 메뉴 방지
    e.stopPropagation(); // 이벤트 전파 중단
    
    // Ctrl/Cmd 키가 눌려있을 때만 삭제
    if (!e.ctrlKey && !e.metaKey) {
      return;
    }
    
    const circle = circles.find(c => c.id === circleId);
    if (!circle) return;
    
    // 삭제 확인 다이얼로그 표시 여부 확인
    if (showDeleteConfirmation) {
      setDeleteConfirmDialog({
        circleId: circleId,
        circleName: circle.name || '제목 없음'
      });
    } else {
      // 바로 삭제
      deleteCircle(circleId);
    }
  };

  const deleteCircle = (circleId: number) => {
    // 화살표 삭제
    const updatedArrows = arrows.filter(
      arrow => arrow.from !== circleId && arrow.to !== circleId
    );
    
    // Circle 삭제
    const updatedCircles = circles.filter(circle => circle.id !== circleId);
    
    // State 업데이트
    setArrows(updatedArrows);
    const newCircles = calculateNodeValues(updatedCircles, updatedArrows);
    setCircles(newCircles);
    
    // 선택된 원이었다면 선택 해제
    if (selectedCircleForArrow === circleId) {
      setSelectedCircleForArrow(null);
    }
    
    // 포커스된 원이었다면 다른 circle로 포커스 이동
    if (focusedCircleId === circleId) {
      // 삭제된 circle을 제외한 다른 circle들 중에서 선택
      const remainingCircles = newCircles.filter(c => c.id !== circleId);
      
      if (remainingCircles.length > 0) {
        // 가장 가까운 circle로 포커스 이동
        const deletedCircle = circles.find(c => c.id === circleId);
        if (deletedCircle) {
          // 거리 기준으로 가장 가까운 circle 찾기
          const nearestCircle = remainingCircles.reduce((nearest, current) => {
            const nearestDist = Math.sqrt(
              Math.pow(nearest.x - deletedCircle.x, 2) + 
              Math.pow(nearest.y - deletedCircle.y, 2)
            );
            const currentDist = Math.sqrt(
              Math.pow(current.x - deletedCircle.x, 2) + 
              Math.pow(current.y - deletedCircle.y, 2)
            );
            return currentDist < nearestDist ? current : nearest;
          });
          setFocusedCircleId(nearestCircle.id);
        } else {
          // 첫 번째 circle로 포커스 이동
          setFocusedCircleId(remainingCircles[0].id);
        }
      } else {
        // 남은 circle이 없으면 포커스 해제
        setFocusedCircleId(null);
        setDetailPanelOpen(false);
      }
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
        // circle이 없으면 그대로 반환
        if (prevCircles.length === 0) return prevCircles;
        
        let updated = [...prevCircles];
        let hasOverlap = false;
        const minDistance = 110; // 두 circle의 중심 사이 ��소 거리 (반지름 55 * 2)
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
  }, []); // 한 번만 설정하고 계속 실행

  // DB 데이터 로드
  const loadDataFromDb = useCallback(async () => {
    if (!dbPath) return;

    setIsLoadingDb(true);
    setDbError(null);
    try {
      console.log('DB 연결 시도:', dbPath);
      // DB 연결
      const connectResult = await (window as any).electron.database.connectDatabase(dbPath);
      if (!connectResult.success) {
        const errorMsg = connectResult.error || 'DB 연결에 실패했습니다.';
        console.error('DB 연결 실패:', errorMsg);
        setDbError(errorMsg);
        setIsLoadingDb(false);
        return;
      }
      console.log('DB 연결 성공');

      // Circle 데이터 로드
      console.log('Circle 데이터 로드 중...');
      const circlesResult = await (window as any).electron.database.loadCircles();
      console.log('Circle 데이터 로드 결과:', circlesResult);
      
      // 관계타입 목록 로드
      console.log('관계타입 목록 로드 중...');
      const relationTypesResult = await (window as any).electron.database.loadRelationTypes();
      if (relationTypesResult.success && relationTypesResult.data) {
        setRelationTypes(relationTypesResult.data);
        console.log('관계타입 목록:', relationTypesResult.data);
      }
      
      // Arrow 데이터 로드 (필터링 적용)
      const currentFilter = selectedRelationTypeIdsRef.current;
      console.log('Arrow 데이터 로드 중... (필터:', currentFilter, ')');
      const arrowsResult = currentFilter && currentFilter.length > 0
        ? await (window as any).electron.database.loadArrowsFiltered(currentFilter)
        : await (window as any).electron.database.loadArrows();
      console.log('Arrow 데이터 로드 결과:', arrowsResult);
      
      if (!circlesResult.success) {
        const errorMsg = circlesResult.error || 'Circle 데이터 로드에 실패했습니다.';
        console.error('Circle 데이터 로드 실패:', errorMsg);
        setDbError(errorMsg);
        setIsLoadingDb(false);
        return;
      }
      
      if (circlesResult.success) {
        // CARDS.id (TEXT)를 숫자 ID로 매핑하기 위한 맵 생성
        const cardIdToNumericIdMap = new Map<string, number>();
        let numericIdCounter = 1;

        // DB에서 가져온 CARDS 데이터를 Circle 인터페이스 형식으로 변환
        const dbCircles = circlesResult.data.map((card: any) => {
          const cardIdStr = String(card.id);
          
          // 이미 매핑된 ID가 없으면 새 숫자 ID 할당
          if (!cardIdToNumericIdMap.has(cardIdStr)) {
            cardIdToNumericIdMap.set(cardIdStr, numericIdCounter++);
          }
          
          const numericId = cardIdToNumericIdMap.get(cardIdStr)!;

          return {
            id: numericId,
            project_id: card.project_id,
            title: card.title || '',
            content: card.content,
            cardtype: card.cardtype,
            complete: card.complete ?? 0,
            activate: card.activate ?? 0,
            duration: card.duration,
            es: card.es,
            ls: card.ls,
            startdate: card.startdate,
            enddate: card.enddate,
            price: card.price,
            createdat: card.createdat,
            // Circle 인터페이스에 필요한 필드 (DB에 없으면 기본값)
            x: card.x ?? Math.random() * (window.innerWidth - 200) + 100,
            y: card.y ?? Math.random() * (window.innerHeight - 200) + 100,
            radius: card.radius ?? 55,
            color: card.color ?? COLORS[numericId % COLORS.length],
            name: card.title || '', // CARDS.title을 Circle.name으로 사용
            value: 0, // 나중에 calculateNodeValues에서 계산됨
            rank: 1, // 나중에 calculateRanks에서 계산됨
            level: 0, // 나중에 calculateLevels에서 계산됨
          } as Circle;
        });
        
        // nextCircleId 업데이트
        if (dbCircles.length > 0) {
          const maxId = Math.max(...dbCircles.map((c: Circle) => c.id));
          setNextCircleId(maxId + 1);
        }

        // Arrow 데이터 설정 (ID 매핑 사용)
        const idMap = cardIdToNumericIdMap;
        
        if (arrowsResult.success) {
          // RELATION 테이블에서 가져온 데이터를 Arrow 인터페이스 형식으로 변환
          const dbArrows = (arrowsResult.data || [])
            .map((relation: any) => {
              // RELATION.source와 target은 CARDS.id (TEXT)
              const sourceIdStr = String(relation.source || '');
              const targetIdStr = String(relation.target || '');
              
              // ID 매핑에서 숫자 ID 찾기
              const fromId = idMap.get(sourceIdStr);
              const toId = idMap.get(targetIdStr);
              
              // 둘 다 유효한 ID가 있어야 화살표 생성
              if (!fromId || !toId) {
                console.warn(`RELATION 매핑 실패: source=${sourceIdStr}, target=${targetIdStr}, idMap 크기=${idMap.size}`);
                // idMap의 키 확인
                console.warn('idMap 키들:', Array.from(idMap.keys()).slice(0, 5));
                return null;
              }
              
              const relationLabel = relation.typename || relation.label || '';
              console.log(`Arrow 생성: id=${relation.relation_id || relation.id}, from=${fromId}, to=${toId}, label=${relationLabel}`);
              
              return {
                id: relation.relation_id || relation.id || 0,
                from: fromId,
                to: toId,
                label: relationLabel, // RELATIONTYPE.typename
              } as Arrow;
            })
            .filter((arrow: Arrow | null) => arrow !== null) as Arrow[];
          
          // nextArrowId 업데이트
          if (dbArrows.length > 0) {
            const maxArrowId = Math.max(...dbArrows.map((a: Arrow) => a.id));
            setNextArrowId(maxArrowId + 1);
          }
          
          // 노드값 재계산 후 설정
          const circlesWithValues = calculateNodeValues(dbCircles, dbArrows);
          setCircles(circlesWithValues);
          setArrows(dbArrows);
          console.log(`데이터 로드 완료: Circle ${dbCircles.length}개, Arrow ${dbArrows.length}개`);
        } else {
          // Arrow 데이터가 없으면 Circle만 설정
          setCircles(dbCircles);
          setArrows([]);
          console.log(`데이터 로드 완료: Circle ${dbCircles.length}개 (Arrow 없음)`);
        }
      } else if (arrowsResult && arrowsResult.success) {
        // Circle이 없고 Arrow만 있는 경우 (이론적으로는 발생하지 않아야 함)
        console.warn('Circle 데이터가 없는데 Arrow 데이터가 있습니다.');
        setArrows([]);
      }
      
      if (!circlesResult.success && (!arrowsResult || !arrowsResult.success)) {
        setDbError('데이터를 불러올 수 없습니다.');
      }

      // 현재 DB 경로 업데이트
      const currentPath = await (window as any).electron.database.getCurrentDbPath();
      setCurrentDbPath(currentPath);
    } catch (error: any) {
      const errorMsg = error.message || '데이터 로드 중 오류가 발생했습니다.';
      console.error('데이터 로드 실패:', error);
      setDbError(errorMsg);
    } finally {
      setIsLoadingDb(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbPath]); // calculateNodeValues는 컴포넌트 내부에 정의되어 있어 의존성에 포함할 필요 없음

  // 초기 DB 경로 로드 및 데이터 로드
  useEffect(() => {
    const initializeDb = async () => {
      try {
        const savedDbPath = await (window as any).electron.database.getDbPath();
        if (savedDbPath) {
          setDbPath(savedDbPath);
        }
      } catch (error) {
        console.error('DB 경로 로드 실패:', error);
      }
    };
    initializeDb();
  }, []);

  // DB 경로가 변경되면 데이터 로드
  useEffect(() => {
    if (dbPath) {
      loadDataFromDb();
    }
  }, [dbPath, loadDataFromDb]);

  // selectedRelationTypeIds 변경 시 ref 업데이트 및 데이터 재로드
  useEffect(() => {
    selectedRelationTypeIdsRef.current = selectedRelationTypeIds;
    if (dbPath && currentDbPath) {
      loadDataFromDb();
    }
  }, [selectedRelationTypeIds, dbPath, currentDbPath, loadDataFromDb]);

  // 초기 노드값 계산 (DB가 없을 때만)
  useEffect(() => {
    if (!dbPath && circles.length > 0) {
      setCircles(calculateNodeValues(circles, arrows));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 스페이스바 눌렀을 때 패닝 모드
      if (e.key === ' ' && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }
      
      // Command/Ctrl + N으로 원 추가
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        addCircle();
      }
      // Command/Ctrl + B로 화살표 ���드 토글
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setArrowMode(prev => !prev);
        setSelectedCircleForArrow(null);
      }
      // Command/Ctrl + M으로 메모장 토글
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        e.preventDefault();
        setNotesPanelOpen(prev => !prev);
      }
      // Command/Ctrl + P로 컨트롤 패널 토글
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setControlPanelOpen(prev => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // 스페이스바 뗐을 때
      if (e.key === ' ') {
        e.preventDefault();
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circles, arrows, nextCircleId, nextArrowId, arrowMode, isSpacePressed]);

  // Auto-layout: rank 기반 자동 배열
  useEffect(() => {
    if (!autoLayoutEnabled || draggedCircleId !== null || editingCircleId !== null) return;

    const updateLayout = () => {
      setCircles(prevCircles => {
        if (prevCircles.length === 0) return prevCircles;

        const updatedCircles = prevCircles.map(circle => ({ ...circle }));
        
        // 1. rank에 따라 목표 y 좌표 계산 (높은 rank = 위쪽)
        const maxRank = Math.max(...updatedCircles.map(c => c.rank), 1);
        const minRank = Math.min(...updatedCircles.map(c => c.rank), 0);
        const rankRange = maxRank - minRank || 1;
        const verticalSpacing = 250; // rank 간 간격
        
        // 각 rank별로 그룹화
        const rankGroups = new Map<number, Circle[]>();
        updatedCircles.forEach(circle => {
          if (!rankGroups.has(circle.rank)) {
            rankGroups.set(circle.rank, []);
          }
          rankGroups.get(circle.rank)!.push(circle);
        });

        // 2. 각 circle의 목표 위치 계산
        updatedCircles.forEach(circle => {
          // rank에 따른 y 좌표 (낮은 rank 숫자 = 높은 순위 = 위쪽)
          const targetY = 300 + (circle.rank - minRank) * verticalSpacing;
          
          // 같은 rank 내에서 x 위치 분산
          const sameRankCircles = rankGroups.get(circle.rank) || [];
          const indexInRank = sameRankCircles.indexOf(circle);
          const totalInRank = sameRankCircles.length;
          const horizontalSpacing = 200;
          const baseX = 400;
          const targetX = baseX + (indexInRank - (totalInRank - 1) / 2) * horizontalSpacing;
          
          // 목표 위치로 부드럽게 이동 (스프링 효과)
          const springStrength = 0.05;
          const dx = targetX - circle.x;
          const dy = targetY - circle.y;
          
          circle.x += dx * springStrength;
          circle.y += dy * springStrength;
        });

        // 3. 겹침 방지 (충돌 회피)
        const repulsionStrength = 2;
        const minDistance = 150; // 최소 거리

        for (let i = 0; i < updatedCircles.length; i++) {
          for (let j = i + 1; j < updatedCircles.length; j++) {
            const c1 = updatedCircles[i];
            const c2 = updatedCircles[j];
            
            const dx = c2.x - c1.x;
            const dy = c2.y - c1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < minDistance && distance > 0) {
              const overlap = minDistance - distance;
              const angle = Math.atan2(dy, dx);
              
              const pushX = Math.cos(angle) * overlap * 0.5 * repulsionStrength;
              const pushY = Math.sin(angle) * overlap * 0.5 * repulsionStrength;
              
              c1.x -= pushX;
              c1.y -= pushY;
              c2.x += pushX;
              c2.y += pushY;
            }
          }
        }

        return updatedCircles;
      });

      animationFrameRef.current = requestAnimationFrame(updateLayout);
    };

    animationFrameRef.current = requestAnimationFrame(updateLayout);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [autoLayoutEnabled, draggedCircleId, editingCircleId, circles.length]);

  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    // 스페이스바 눌린 상태면 패닝 시작
    if (isSpacePressed) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
      return;
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // 우클릭은 무시 (우클릭은 삭제 전용)
    if (e.button === 2) return;
    
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
      const worldPos = screenToWorld(e.clientX, e.clientY);
      addCircle(worldPos.x, worldPos.y);
    }
  };

  const handleBackgroundDoubleClick = (e: React.MouseEvent) => {
    // 방금 드래그가 끝났으면 무시
    if (justFinishedDrawing.current) return;
    
    // SVG나 최상위 div를 더블클릭한 경우 원 생성
    const target = e.target as HTMLElement | SVGElement;
    const tagName = target.tagName?.toLowerCase();
    
    if (tagName === 'svg' || e.target === e.currentTarget) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      addCircle(worldPos.x, worldPos.y);
    }
  };

  // 포커스된 circle을 화면 중심으로 이동 (설정이 활성화된 경우만)
  useEffect(() => {
    if (!autoTrackFocusedNode) return; // 설정이 꺼져있으면 실행하지 않음
    if (focusedCircleId === null) return;
    
    const focusedCircle = circles.find(c => c.id === focusedCircleId);
    if (!focusedCircle) return;
    
    // 화면 중심 좌표
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // 포커스된 circle을 화면 중심에 오도록 pan 조정
    // 화면 좌표 = (월드 좌표 * zoom) + pan
    // 따라서: pan = 화면 좌표 - (월드 좌표 * zoom)
    const newPanX = centerX - (focusedCircle.x * zoom);
    const newPanY = centerY - (focusedCircle.y * zoom);
    
    setPan({ x: newPanX, y: newPanY });
  }, [focusedCircleId, zoom, autoTrackFocusedNode]);

  // 삭제 확인 다이얼로그 키보드 핸들러
  useEffect(() => {
    if (!deleteConfirmDialog) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter 키로 삭제
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        e.stopPropagation();
        deleteCircle(deleteConfirmDialog.circleId);
        setDeleteConfirmDialog(null);
      }
      // Escape 키로 취소
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setDeleteConfirmDialog(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteConfirmDialog]);

  // 키보드 네비게이션 (좌우 방향키 + 위 방향키로 자식 생성)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 삭제 확인 다이얼로그가 열려있으면 다른 키보드 이벤트 무시
      if (deleteConfirmDialog) return;
      // Cmd/Ctrl + Up Arrow: 선택된 circle 위에 새 circle 생성 및 연결
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowUp') {
        e.preventDefault();
        
        if (focusedCircleId === null) return;
        
        const focusedCircle = circles.find(c => c.id === focusedCircleId);
        if (!focusedCircle) return;
        
        // 겹치지 않는 위치 찾기
        const targetPos = findNonOverlappingPosition(focusedCircle.x, focusedCircle.y - 150);
        
        // 현재 circle 위에 새 circle 생성
        const newCircle: Circle = {
          id: nextCircleId,
          project_id: null,
          title: '',
          content: null,
          cardtype: null,
          complete: 0,
          activate: 0,
          duration: null,
          es: null,
          ls: null,
          startdate: null,
          enddate: null,
          price: null,
          createdat: new Date().toISOString(),
          x: targetPos.x,
          y: targetPos.y,
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
          label: '',
        };
        
        const updatedCircles = [...circles, newCircle];
        const updatedArrows = [...arrows, newArrow];
        
        setCircles(calculateNodeValues(updatedCircles, updatedArrows));
        setArrows(updatedArrows);
        setNextCircleId(nextCircleId + 1);
        setNextArrowId(nextArrowId + 1);
        setFocusedCircleId(nextCircleId); // 새 circle로 포커스 이동
        
        // 새 circle의 이름 편집 모드로 진입
        setEditingCircleId(nextCircleId);
        setEditingName('');
        editingNameRef.current = '';
        
        return;
      }

      // Cmd/Ctrl + Down Arrow: 선택된 circle 아래에 새 circle 생성 및 연결
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowDown') {
        e.preventDefault();
        
        if (focusedCircleId === null) return;
        
        const focusedCircle = circles.find(c => c.id === focusedCircleId);
        if (!focusedCircle) return;
        
        // 겹치지 않는 위치 찾기
        const targetPos = findNonOverlappingPosition(focusedCircle.x, focusedCircle.y + 150);
        
        // 현재 circle 아래에 새 circle 생성
        const newCircle: Circle = {
          id: nextCircleId,
          project_id: null,
          title: '',
          content: null,
          cardtype: null,
          complete: 0,
          activate: 0,
          duration: null,
          es: null,
          ls: null,
          startdate: null,
          enddate: null,
          price: null,
          createdat: new Date().toISOString(),
          x: targetPos.x,
          y: targetPos.y,
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
          label: '',
        };
        
        const updatedCircles = [...circles, newCircle];
        const updatedArrows = [...arrows, newArrow];
        
        setCircles(calculateNodeValues(updatedCircles, updatedArrows));
        setArrows(updatedArrows);
        setNextCircleId(nextCircleId + 1);
        setNextArrowId(nextArrowId + 1);
        setFocusedCircleId(nextCircleId); // 새 circle로 포커스 이동
        
        // 새 circle의 이름 편집 모드로 진입
        setEditingCircleId(nextCircleId);
        setEditingName('');
        editingNameRef.current = '';
        
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
        const targetPos = findNonOverlappingPosition(focusedCircle.x + offsetX, focusedCircle.y);
        
        const newCircle: Circle = {
          id: nextCircleId,
          project_id: null,
          title: '',
          content: null,
          cardtype: null,
          complete: 0,
          activate: 0,
          duration: null,
          es: null,
          ls: null,
          startdate: null,
          enddate: null,
          price: null,
          createdat: new Date().toISOString(),
          x: targetPos.x,
          y: targetPos.y,
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
            label: '',
          });
          newArrowId++;
        });
        
        // 자식들과 연결
        childArrows.forEach(arrow => {
          updatedArrows.push({
            id: newArrowId,
            from: nextCircleId,
            to: arrow.to,
            label: '',
          });
          newArrowId++;
        });
        
        setCircles(calculateNodeValues(updatedCircles, updatedArrows));
        setArrows(updatedArrows);
        setNextCircleId(nextCircleId + 1);
        setNextArrowId(newArrowId);
        setFocusedCircleId(nextCircleId); // 새 circle로 포커스 이동
        
        // 새 circle의 이름 편집 모드로 진입
        setEditingCircleId(nextCircleId);
        setEditingName('');
        editingNameRef.current = '';
        
        return;
      }
      
      // 'D' 키로 detail 패널 토글
      if (e.key === 'd' || e.key === 'D') {
        // Cmd/Ctrl + D는 삭제 기능
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          if (focusedCircleId !== null) {
            const circle = circles.find(c => c.id === focusedCircleId);
            if (circle) {
              // 삭제 확인 다이얼로그 표시 여부 확인
              if (showDeleteConfirmation) {
                setDeleteConfirmDialog({
                  circleId: focusedCircleId,
                  circleName: circle.name || '제목 없음'
                });
              } else {
                // 바로 삭제
                deleteCircle(focusedCircleId);
              }
            }
          }
        }
        return;
      }
      
      // Enter 키로 detail 패널 열기 (삭제 확인 다이얼로그가 열려있지 않을 때만)
      if (e.key === 'Enter' && !deleteConfirmDialog) {
        e.preventDefault();
        if (focusedCircleId !== null) {
          setDetailPanelOpen(true);
        }
        return;
      }
      
      // 현재 포커스된 circle이 없으면 무시
      if (focusedCircleId === null) return;
      
      // 방향키가 아니면 무시
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      
      const focusedCircle = circles.find(c => c.id === focusedCircleId);
      if (!focusedCircle) return;
      
      // 위아래 방향키: 부모/자식 노드로 이동
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const isUpDirection = e.key === 'ArrowUp';
        
        // 부모 노드 찾기 (ArrowUp) 또는 자식 노드 찾기 (ArrowDown)
        const connectedCircles = isUpDirection
          ? arrows.filter(a => a.to === focusedCircleId).map(a => circles.find(c => c.id === a.from)).filter(c => c !== undefined) as Circle[]
          : arrows.filter(a => a.from === focusedCircleId).map(a => circles.find(c => c.id === a.to)).filter(c => c !== undefined) as Circle[];
        
        if (connectedCircles.length === 0) return;
        
        // 여러 개면 가장 가까운 것 선택
        if (connectedCircles.length === 1) {
          setFocusedCircleId(connectedCircles[0].id);
        } else {
          // 거리 계산
          const distances = connectedCircles.map(c => ({
            id: c.id,
            distance: Math.sqrt(Math.pow(c.x - focusedCircle.x, 2) + Math.pow(c.y - focusedCircle.y, 2))
          }));
          
          // 가장 가까운 것
          const nearest = distances.reduce((min, curr) => curr.distance < min.distance ? curr : min);
          setFocusedCircleId(nearest.id);
        }
        
        return;
      }
      
      // 좌우 방향키: 같은 rank의 circle들 간 이동
      const sameRankCircles = circles.filter(c => c.rank === focusedCircle.rank);
      
      // rank에 circle이 하나만 있으면 무시
      if (sameRankCircles.length <= 1) return;
      
      // x 좌표 기준으로 정렬
      const sorted = [...sameRankCircles].sort((a, b) => a.x - b.x);
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
  }, [focusedCircleId, circles, arrows, nextCircleId, nextArrowId, detailPanelOpen, deleteConfirmDialog]);

  // 휠로 확대/축소
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, zoom * delta));
    
    // 마우스 위치를 기준으로 확대/축소
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const dx = mouseX - pan.x;
    const dy = mouseY - pan.y;
    
    setPan({
      x: mouseX - dx * (newZoom / zoom),
      y: mouseY - dy * (newZoom / zoom)
    });
    
    setZoom(newZoom);
  };

  return (
    <div 
      className="w-full h-screen overflow-hidden relative transition-all duration-300"
      style={{ 
        backgroundColor: '#000000',
        cursor: isSpacePressed ? 'grab' : isPanning ? 'grabbing' : 'default'
      }}
      onMouseMove={handleMouseMove}
      onMouseDown={handleBackgroundMouseDown}
      onMouseUp={(e) => { 
        setIsPanning(false); 
        handleMouseUp(e as unknown as React.MouseEvent);
      }}
      onMouseLeave={(e) => { 
        setIsPanning(false); 
        handleMouseUp(e as unknown as React.MouseEvent);
      }}
      onClick={handleBackgroundClick}
      onDoubleClick={handleBackgroundDoubleClick}
      onWheel={handleWheel}
    >
      {/* SVG for arrows - positioned behind circles */}
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1, pointerEvents: 'none' }}>
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
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
              onClick={(e) => {
                e.stopPropagation();
                if (!arrowMode) {
                  setEditingArrowId(arrow.id);
                  setEditingCircleId(null);
                }
              }}
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
                stroke="rgba(255, 255, 255, 0.6)"
                strokeWidth="3"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1, delay: index * 0.1, ease: "easeInOut" }}
                pointerEvents="none"
              />
              <motion.path
                d={arrowhead}
                stroke="rgba(255, 255, 255, 0.6)"
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
                stroke="rgba(255, 255, 255, 0.7)"
                strokeWidth="3"
                strokeDasharray="8,5"
                pointerEvents="none"
              />
              <path
                d={createArrowhead(drawingArrow.x, drawingArrow.y, angle)}
                stroke="rgba(255, 255, 255, 0.7)"
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
              stroke="#FFFFFF"
              strokeWidth="4"
              strokeDasharray="12 8"
              fill="none"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
          );
        })()}
        </g>
      </svg>

      {/* Circles - positioned above arrows */}
      <div 
        className="absolute inset-0" 
        style={{ 
          zIndex: 2, 
          pointerEvents: 'none',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {circles.filter(c => !isNaN(c.x) && !isNaN(c.y) && !isNaN(c.radius)).map((circle, index) => (
          <motion.div
            key={circle.id}
            className={`absolute rounded-full flex items-center justify-center ${
              arrowMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
            } ${selectedCircleForArrow === circle.id ? 'ring-4 ring-white' : ''}`}
            style={{
              left: circle.x - circle.radius,
              top: circle.y - circle.radius,
              width: circle.radius * 2,
              height: circle.radius * 2,
              backgroundColor: circle.color,
              pointerEvents: 'auto',
              border: '3px solid #FFFFFF',
              boxShadow: '0 8px 24px rgba(255, 255, 255, 0.2)',
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
              // 우클릭은 무시
              if (e.button === 2) return;
              e.stopPropagation();
              // 드래그하지 않고 제자리에서 클릭했을 때만 포커싱
              if (!arrowMode && !hasDragged.current) {
                setFocusedCircleId(circle.id);
              }
            }}
            onMouseEnter={(e) => {
              // 0.5초 후 tooltip 표시
              if (hoverTimer.current) {
                clearTimeout(hoverTimer.current);
              }
              hoverTimer.current = window.setTimeout(() => {
                setHoveredCircleId(circle.id);
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }, 500);
            }}
            onMouseMove={(e) => {
              // 마우스 이동 시 tooltip 위치 업데이트
              if (hoveredCircleId === circle.id) {
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }
            }}
            onMouseLeave={() => {
              // Tooltip 숨기기
              if (hoverTimer.current) {
                clearTimeout(hoverTimer.current);
                hoverTimer.current = null;
              }
              setHoveredCircleId(null);
            }}
          >
            <div className="flex flex-col items-center justify-center gap-0.5">
              {editingCircleId === circle.id ? (
                <Input
                  value={editingName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onBlur={handleNameSubmit}
                  onKeyDown={(e) => {
                    // cmd/ctrl + arrow 키는 전역 핸들러가 처리하도록 허용
                    if ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                      // 편집 내용 저장 후 편집 모드만 종료
                      setCircles(prevCircles =>
                        prevCircles.map((circle) =>
                          circle.id === editingCircleId
                            ? { ...circle, name: editingNameRef.current }
                            : circle
                        )
                      );
                      setEditingCircleId(null);
                      setEditingName('');
                      editingNameRef.current = '';
                      // 이벤트 전파는 허용하여 전역 핸들러가 실행되도록 함
                      return;
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation(); // 이벤트 전파 방지하여 detail 패널이 열리지 않도록
                      handleNameSubmit();
                    } else if (e.key === 'Escape') {
                      setEditingCircleId(null);
                      setEditingName('');
                      editingNameRef.current = '';
                    }
                  }}
                  autoFocus
                  className="w-20 h-8 text-center text-sm p-1 bg-white text-black border-2 border-black"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="text-sm select-none px-2 text-center break-words max-w-full uppercase" style={{ color: '#FFFFFF', opacity: 0.9, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.08em' }}>
                  {circle.name || '제목 없음'}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Arrow Labels */}
      {showArrowLabels && (
      <div 
        className="absolute inset-0" 
        style={{ 
          zIndex: 2, 
          pointerEvents: 'none',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {arrows.map((arrow) => {
          const fromCircle = circles.find(c => c.id === arrow.from);
          const toCircle = circles.find(c => c.id === arrow.to);
          
          if (!fromCircle || !toCircle) return null;
          
          // 화살표의 중간 지점 계산 (월드 좌표계)
          const midX = (fromCircle.x + toCircle.x) / 2;
          const midY = (fromCircle.y + toCircle.y) / 2;
          
          return (
            <div
              key={`label-${arrow.id}`}
              className="absolute"
              style={{
                left: midX,
                top: midY,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'auto',
              }}
            >
              {editingArrowId === arrow.id ? (
                <Input
                  value={editingArrowLabel}
                  onChange={(e) => {
                    setEditingArrowLabel(e.target.value);
                    editingArrowLabelRef.current = e.target.value;
                  }}
                  onBlur={() => {
                    setArrows(prevArrows =>
                      prevArrows.map((a) =>
                        a.id === arrow.id ? { ...a, label: editingArrowLabel } : a
                      )
                    );
                    setEditingArrowId(null);
                  }}
                  onKeyDown={(e) => {
                    // cmd/ctrl + arrow 키는 전역 핸들러가 처리하도록 허용
                    if ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                      // 편집 내용 저장 후 편집 모드만 종료
                      setArrows(prevArrows =>
                        prevArrows.map((a) =>
                          a.id === editingArrowId ? { ...a, label: editingArrowLabelRef.current } : a
                        )
                      );
                      setEditingArrowId(null);
                      setEditingArrowLabel('');
                      editingArrowLabelRef.current = '';
                      // 이벤트 전파는 허용하여 전역 핸들러가 실행되도록 함
                      return;
                    }
                    if (e.key === 'Enter') {
                      setArrows(prevArrows =>
                        prevArrows.map((a) =>
                          a.id === arrow.id ? { ...a, label: editingArrowLabel } : a
                        )
                      );
                      setEditingArrowId(null);
                    } else if (e.key === 'Escape') {
                      setEditingArrowId(null);
                      setEditingArrowLabel('');
                      editingArrowLabelRef.current = '';
                    }
                  }}
                  autoFocus
                  className="w-24 h-8 text-center text-sm p-1 bg-white text-black border-2 border-black"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              ) : arrow.label ? (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!arrowMode) {
                      setEditingArrowId(arrow.id);
                      setEditingCircleId(null);
                    }
                  }}
                  className="px-3 py-1 rounded-full cursor-pointer select-none"
                  style={{
                    backgroundColor: 'rgba(100, 100, 100, 0.9)',
                    border: '2px solid rgba(255, 255, 255, 0.5)',
                    color: '#FFFFFF',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '12px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  {arrow.label}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      )}

      {/* Control panel */}
      {/* Control Panel */}
      <div className="absolute top-8 left-8 flex items-start gap-3" style={{ zIndex: 3 }}>
        {/* Collapsible Panel */}
        <motion.div 
          initial={false}
          animate={{ 
            width: controlPanelOpen ? 'auto' : 0,
            opacity: controlPanelOpen ? 1 : 0
          }}
          transition={{ type: 'spring', damping: 20, stiffness: 150 }}
          className="overflow-hidden"
        >
          <div className="flex flex-col gap-5" style={{ width: '320px' }}>
            {/* Input fields */}
            <div className="flex items-center gap-3 p-4 rounded-full border-3" style={{ backgroundColor: '#4A4A4A', borderColor: 'rgba(255, 255, 255, 0.3)' }}>
              <Input 
                placeholder="START" 
                value={startTitle}
                onChange={(e) => setStartTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    handleAddRelationship('start');
                  }
                }}
                className="bg-white text-black border-2 border-black placeholder:text-black/50 uppercase"
                style={{ letterSpacing: '0.08em' }}
              />
              <ArrowRight className="w-5 h-5 flex-shrink-0" style={{ color: '#FFFFFF' }} />
              <Input 
                placeholder="END" 
                value={endTitle}
                onChange={(e) => setEndTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    handleAddRelationship('end');
                  }
                }}
                className="bg-white text-black border-2 border-black placeholder:text-black/50 uppercase"
                style={{ letterSpacing: '0.08em' }}
              />
            </div>

            <Button 
              onClick={handleAddRelationship}
              className="gap-2 rounded-full py-6 uppercase transition-all duration-300 hover:scale-105"
              style={{ 
                backgroundColor: '#6A6A6A', 
                color: '#FFFFFF',
                border: '3px solid rgba(255, 255, 255, 0.5)',
                letterSpacing: '0.08em',
                fontWeight: 700
              }}
              disabled={!startTitle.trim() || !endTitle.trim()}
            >
              <GitBranch className="w-5 h-5" />
              ADD CONNECTION
            </Button>

            <Button 
              onClick={addCircle} 
              className="gap-2 rounded-full py-6 uppercase transition-all duration-300 hover:scale-105"
              style={{ 
                backgroundColor: '#6A6A6A', 
                color: '#FFFFFF',
                border: '3px solid rgba(255, 255, 255, 0.5)',
                letterSpacing: '0.08em',
                fontWeight: 700
              }}
            >
              <Plus className="w-5 h-5" />
              ADD CIRCLE
              <span className="text-xs ml-1" style={{ opacity: 0.6 }}>(⌘N)</span>
            </Button>

            {/* 화살표 모드 토글 */}
            <div className="flex items-center gap-4 p-4 rounded-full border-3" style={{ backgroundColor: '#4A4A4A', borderColor: 'rgba(255, 255, 255, 0.3)' }}>
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
                style={{ color: '#FFFFFF', letterSpacing: '0.08em', fontWeight: 700 }}
              >
                <GitBranch className="w-4 h-4" />
                <span>ARROW MODE</span>
                {arrowMode && (
                  <span className="text-xs px-3 py-1 rounded-full uppercase" style={{ backgroundColor: '#FFFFFF', color: '#000000', fontWeight: 700 }}>ON</span>
                )}
                <span className="text-xs" style={{ opacity: 0.6 }}>(⌘B)</span>
              </Label>
            </div>

            {arrowMode && (
              <p className="text-sm p-4 rounded-full uppercase border-3" style={{ 
                color: '#FFFFFF', 
                backgroundColor: '#4A4A4A',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                letterSpacing: '0.08em',
                fontFamily: 'IBM Plex Mono, monospace'
              }}>
                {selectedCircleForArrow === null
                  ? 'SELECT FIRST CIRCLE'
                  : 'SELECT SECOND CIRCLE'}
              </p>
            )}
          </div>
        </motion.div>

        {/* Toggle Button */}
        <Button
          onClick={() => setControlPanelOpen(!controlPanelOpen)}
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
          style={{ 
            backgroundColor: '#6A6A6A', 
            color: '#FFFFFF',
            border: '3px solid rgba(255, 255, 255, 0.5)'
          }}
        >
          {controlPanelOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </Button>

        {/* Settings Button */}
        <Button
          onClick={() => setSettingsPanelOpen(!settingsPanelOpen)}
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
          style={{ 
            backgroundColor: '#6A6A6A', 
            color: '#FFFFFF',
            border: '3px solid rgba(255, 255, 255, 0.5)'
          }}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {/* Circle Details Panel */}
      {focusedCircleId !== null && (() => {
        const selectedCircle = circles.find(c => c.id === focusedCircleId);
        if (!selectedCircle) return null;

        // 연결된 화살표 찾기
        const outgoingArrows = arrows.filter(a => a.from === focusedCircleId);
        const incomingArrows = arrows.filter(a => a.to === focusedCircleId);

        return (
          <div 
            className="absolute top-8 transition-all duration-300" 
            style={{ 
              zIndex: 3,
              right: detailPanelOpen ? '2rem' : '-24rem'
            }}
          >
            {/* Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDetailPanelOpen(!detailPanelOpen)}
              className="absolute -left-12 top-4 h-10 w-10 rounded-full hover:bg-white hover:text-black transition-all duration-300"
              style={{ 
                color: '#FFFFFF',
                backgroundColor: '#4A4A4A',
                border: '2px solid rgba(255, 255, 255, 0.4)'
              }}
            >
              {detailPanelOpen ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>

            <div className="w-96">
            <Card className="shadow-2xl border-3 rounded-3xl" style={{ 
              backgroundColor: '#4A4A4A', 
              borderColor: 'rgba(255, 255, 255, 0.4)',
            }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                <CardTitle className="text-2xl uppercase" style={{ 
                  color: '#FFFFFF', 
                  fontFamily: 'League Spartan, sans-serif',
                  letterSpacing: '0.1em',
                  fontWeight: 800
                }}>CIRCLE DETAILS</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDetailPanelOpen(false)}
                  className="h-10 w-10 rounded-full hover:bg-white hover:text-black transition-all duration-300"
                  style={{ color: '#FFFFFF' }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                {/* ID */}
                <div className="space-y-2">
                  <Label className="uppercase" style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>ID</Label>
                  <div className="text-xl" style={{ color: '#FFFFFF', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.05em' }}>#{selectedCircle.id}</div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label className="uppercase" style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>NAME</Label>
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
                    className="text-lg uppercase bg-[#2A2A2A] border-2 text-white placeholder:text-white/30 rounded-xl"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.3)', letterSpacing: '0.05em' }}
                  />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <Label className="uppercase" style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>CONTENT</Label>
                  <Textarea
                    value={selectedCircle.content || ''}
                    onChange={(e) => {
                      setCircles(circles.map(c =>
                        c.id === focusedCircleId
                          ? { ...c, content: e.target.value }
                          : c
                      ));
                    }}
                    placeholder="ENTER CONTENT..."
                    className="bg-[#2A2A2A] border-2 text-white placeholder:text-white/30 rounded-xl min-h-[120px] resize-y"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.3)', letterSpacing: '0.05em' }}
                  />
                </div>

                {/* Color */}
                <div className="space-y-2">
                  <Label className="uppercase" style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>COLOR</Label>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-14 h-14 rounded-full border-3"
                      style={{ backgroundColor: selectedCircle.color, borderColor: 'rgba(255, 255, 255, 0.4)' }}
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
                      className="flex-1 bg-[#2A2A2A] border-2 text-white rounded-xl"
                      style={{ borderColor: 'rgba(255, 255, 255, 0.3)', letterSpacing: '0.05em', fontFamily: 'IBM Plex Mono, monospace' }}
                    />
                  </div>
                </div>

                {/* Node Value */}
                <div className="space-y-2">
                  <Label className="uppercase" style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>NODE VALUE</Label>
                  <div className="text-3xl" style={{ color: '#FFFFFF', fontFamily: 'League Spartan, sans-serif', fontWeight: 800, letterSpacing: '0.05em' }}>{selectedCircle.value}</div>
                  <p className="text-xs uppercase" style={{ color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.05em' }}>
                    (CHILDREN COUNT + VALUES SUM)
                  </p>
                </div>

                {/* Rank */}
                <div className="space-y-2">
                  <Label className="uppercase" style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>RANK</Label>
                  <div className="text-3xl" style={{ color: '#FFFFFF', fontFamily: 'League Spartan, sans-serif', fontWeight: 800, letterSpacing: '0.05em' }}>#{selectedCircle.rank}</div>
                  <p className="text-xs uppercase" style={{ color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.05em' }}>
                    GROUP RANKING
                  </p>
                </div>

                {/* Level */}
                <div className="space-y-2">
                  <Label className="uppercase" style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>LEVEL</Label>
                  <div className="text-3xl" style={{ color: '#FFFFFF', fontFamily: 'League Spartan, sans-serif', fontWeight: 800, letterSpacing: '0.05em' }}>{selectedCircle.level}</div>
                  <p className="text-xs uppercase" style={{ color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.05em' }}>
                    ARROW DEPTH
                  </p>
                </div>

                {/* Position */}
                <div className="space-y-2">
                  <Label className="uppercase" style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>POSITION</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border-2" style={{ backgroundColor: '#2A2A2A', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                      <span className="text-xs uppercase block" style={{ color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.05em' }}>X</span>
                      <span className="text-lg" style={{ color: '#FFFFFF', fontFamily: 'IBM Plex Mono, monospace' }}>{Math.round(selectedCircle.x)}</span>
                    </div>
                    <div className="p-3 rounded-xl border-2" style={{ backgroundColor: '#2A2A2A', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                      <span className="text-xs uppercase block" style={{ color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.05em' }}>Y</span>
                      <span className="text-lg" style={{ color: '#FFFFFF', fontFamily: 'IBM Plex Mono, monospace' }}>{Math.round(selectedCircle.y)}</span>
                    </div>
                  </div>
                </div>

                {/* Connections */}
                <div className="space-y-2">
                  <Label className="uppercase" style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>CONNECTIONS</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-xl border-2" style={{ backgroundColor: '#2A2A2A', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                      <span className="text-sm uppercase" style={{ color: 'rgba(255, 255, 255, 0.7)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.05em' }}>OUTGOING</span>
                      <span className="text-lg" style={{ color: '#FFFFFF', fontFamily: 'League Spartan, sans-serif', fontWeight: 700 }}>{outgoingArrows.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl border-2" style={{ backgroundColor: '#2A2A2A', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                      <span className="text-sm uppercase" style={{ color: 'rgba(255, 255, 255, 0.7)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.05em' }}>INCOMING</span>
                      <span className="text-lg" style={{ color: '#FFFFFF', fontFamily: 'League Spartan, sans-serif', fontWeight: 700 }}>{incomingArrows.length}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }} />

                {/* Actions */}
                <div className="space-y-2">
                  <Button
                    className="w-full rounded-full py-6 uppercase transition-all duration-300 hover:scale-105"
                    style={{ 
                      backgroundColor: '#d4183d',
                      color: '#FFFFFF',
                      border: '3px solid rgba(212, 24, 61, 0.5)',
                      letterSpacing: '0.08em',
                      fontWeight: 700
                    }}
                    onClick={(e) => {
                      handleCircleRightClick(e as any, focusedCircleId);
                      setDetailPanelOpen(false);
                    }}
                  >
                    DELETE CIRCLE
                  </Button>
                </div>
              </CardContent>
            </Card>
            </div>
          </div>
        );
      })()}
      
      {/* Hover Tooltip */}
      {hoveredCircleId !== null && (() => {
        const circle = circles.find(c => c.id === hoveredCircleId);
        if (!circle || !circle.name) return null;
        
        return (
          <div
            className="fixed z-[100] px-4 py-2 rounded-lg shadow-xl pointer-events-none"
            style={{
              left: `${tooltipPosition.x + 15}px`,
              top: `${tooltipPosition.y - 10}px`,
              backgroundColor: '#4A4A4A',
              border: '2px solid #FFFFFF',
              boxShadow: '0 8px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15)',
              color: '#FFFFFF',
              fontFamily: 'Courier New, monospace',
              maxWidth: '300px',
              wordWrap: 'break-word',
            }}
          >
            {circle.name}
          </div>
        );
      })()}

      {/* Zoom 컨트롤 */}
      <div 
        className="fixed bottom-6 left-6 z-50 px-6 py-4 rounded-lg shadow-lg"
        style={{ 
          backgroundColor: '#4A4A4A',
          border: '3px solid rgba(255, 255, 255, 0.5)',
          boxShadow: '0 8px 16px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.1)'
        }}
      >
        <div className="flex items-center gap-4 min-w-[280px]">
          <ZoomOut className="w-5 h-5" style={{ color: '#FFFFFF' }} />
          <Slider
            value={[zoom]}
            onValueChange={(value) => setZoom(value[0])}
            min={0.1}
            max={5}
            step={0.1}
            className="flex-1"
          />
          <ZoomIn className="w-5 h-5" style={{ color: '#FFFFFF' }} />
          <div 
            className="ml-2 px-3 py-1 rounded text-center min-w-[60px]"
            style={{ 
              backgroundColor: '#2A2A2A',
              color: '#FFFFFF',
              border: '2px solid rgba(255, 255, 255, 0.5)',
              fontFamily: 'Courier New, monospace'
            }}
          >
            {Math.round(zoom * 100)}%
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {settingsPanelOpen && (
        <div className="absolute top-8 right-8 w-96" style={{ zIndex: 4 }}>
          <Card className="shadow-2xl border-3 rounded-3xl" style={{ 
            backgroundColor: '#4A4A4A', 
            borderColor: 'rgba(255, 255, 255, 0.4)',
          }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
              <CardTitle className="text-2xl uppercase" style={{ 
                color: '#FFFFFF', 
                fontFamily: 'League Spartan, sans-serif',
                letterSpacing: '0.1em',
                fontWeight: 800
              }}>SETTINGS</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsPanelOpen(false)}
                className="h-10 w-10 rounded-full hover:bg-white hover:text-black transition-all duration-300"
                style={{ color: '#FFFFFF' }}
              >
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl border-2" style={{ 
                borderColor: 'rgba(255, 255, 255, 0.3)',
                backgroundColor: '#2A2A2A'
              }}>
                <Label className="uppercase cursor-pointer" style={{ 
                  color: '#FFFFFF', 
                  fontSize: '0.875rem', 
                  letterSpacing: '0.08em',
                  fontFamily: 'IBM Plex Mono, monospace'
                }}>
                  삭제 시 확인 창 표시
                </Label>
                <Switch
                  checked={showDeleteConfirmation}
                  onCheckedChange={(checked) => {
                    setShowDeleteConfirmation(checked);
                    localStorage.setItem('showDeleteConfirmation', JSON.stringify(checked));
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border-2" style={{ 
                borderColor: 'rgba(255, 255, 255, 0.3)',
                backgroundColor: '#2A2A2A'
              }}>
                <Label className="uppercase cursor-pointer" style={{ 
                  color: '#FFFFFF', 
                  fontSize: '0.875rem', 
                  letterSpacing: '0.08em',
                  fontFamily: 'IBM Plex Mono, monospace'
                }}>
                  Rank 기반 자동 배열
                </Label>
                <Switch
                  checked={autoLayoutEnabled}
                  onCheckedChange={setAutoLayoutEnabled}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border-2" style={{ 
                borderColor: 'rgba(255, 255, 255, 0.3)',
                backgroundColor: '#2A2A2A'
              }}>
                <Label className="uppercase cursor-pointer" style={{ 
                  color: '#FFFFFF', 
                  fontSize: '0.875rem', 
                  letterSpacing: '0.08em',
                  fontFamily: 'IBM Plex Mono, monospace'
                }}>
                  자동 활성화 노드 트래킹 추적
                </Label>
                <Switch
                  checked={autoTrackFocusedNode}
                  onCheckedChange={(checked) => {
                    setAutoTrackFocusedNode(checked);
                    localStorage.setItem('autoTrackFocusedNode', JSON.stringify(checked));
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border-2" style={{ 
                borderColor: 'rgba(255, 255, 255, 0.3)',
                backgroundColor: '#2A2A2A'
              }}>
                <Label className="uppercase cursor-pointer" style={{ 
                  color: '#FFFFFF', 
                  fontSize: '0.875rem', 
                  letterSpacing: '0.08em',
                  fontFamily: 'IBM Plex Mono, monospace'
                }}>
                  관계명 표시
                </Label>
                <Switch
                  checked={showArrowLabels}
                  onCheckedChange={(checked) => {
                    setShowArrowLabels(checked);
                    localStorage.setItem('showArrowLabels', JSON.stringify(checked));
                  }}
                />
              </div>

              {/* DB 경로 설정 */}
              <div className="space-y-3 p-4 rounded-xl border-2" style={{ 
                borderColor: 'rgba(255, 255, 255, 0.3)',
                backgroundColor: '#2A2A2A'
              }}>
                <Label className="uppercase" style={{ 
                  color: '#FFFFFF', 
                  fontSize: '0.875rem', 
                  letterSpacing: '0.08em',
                  fontFamily: 'IBM Plex Mono, monospace',
                  display: 'block',
                  marginBottom: '0.5rem'
                }}>
                  데이터베이스 경로
                </Label>
                
                {/* 현재 연결된 DB 경로 표시 */}
                {currentDbPath && (
                  <div className="p-2 rounded mb-2 text-xs" style={{ 
                    backgroundColor: '#1A1A1A',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontFamily: 'IBM Plex Mono, monospace',
                    wordBreak: 'break-all'
                  }}>
                    현재 연결: {currentDbPath}
                  </div>
                )}

                {/* 에러 메시지 표시 */}
                {dbError && (
                  <div className="p-2 rounded mb-2 text-xs" style={{ 
                    backgroundColor: '#4A1A1A',
                    color: '#FF6B6B',
                    fontFamily: 'IBM Plex Mono, monospace',
                    wordBreak: 'break-all',
                    border: '1px solid #FF6B6B'
                  }}>
                    오류: {dbError}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Input
                    value={dbPath || ''}
                    onChange={(e) => setDbPath(e.target.value)}
                    placeholder="DB 파일 경로를 입력하세요..."
                    className="flex-1 bg-[#1A1A1A] border-2 text-white placeholder:text-white/30 rounded-xl"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.3)', letterSpacing: '0.05em', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem' }}
                    disabled={isLoadingDb}
                  />
                  <Button
                    onClick={async () => {
                      try {
                        setDbError(null);
                        const selectedPath = await (window as any).electron.database.selectDbFile();
                        if (selectedPath) {
                          setDbPath(selectedPath);
                          await (window as any).electron.database.setDbPath(selectedPath);
                          await loadDataFromDb();
                        }
                      } catch (error: any) {
                        const errorMsg = error.message || '파일 선택에 실패했습니다.';
                        console.error('파일 선택 실패:', error);
                        setDbError(errorMsg);
                      }
                    }}
                    disabled={isLoadingDb}
                    className="px-4 py-2 rounded-xl uppercase text-xs"
                    style={{
                      backgroundColor: '#6A6A6A',
                      color: '#FFFFFF',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      letterSpacing: '0.08em',
                      fontFamily: 'IBM Plex Mono, monospace',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    선택
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      if (dbPath) {
                        setDbError(null);
                        await (window as any).electron.database.setDbPath(dbPath);
                        await loadDataFromDb();
                      }
                    }}
                    disabled={isLoadingDb || !dbPath}
                    className="flex-1 rounded-xl uppercase text-xs"
                    style={{
                      backgroundColor: '#6A6A6A',
                      color: '#FFFFFF',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      letterSpacing: '0.08em',
                      fontFamily: 'IBM Plex Mono, monospace'
                    }}
                  >
                    {isLoadingDb ? '로딩 중...' : '연결'}
                  </Button>
                  <Button
                    onClick={async () => {
                      await (window as any).electron.database.setDbPath(null);
                      setDbPath(null);
                      setCurrentDbPath(null);
                      setDbError(null);
                      setCircles([]);
                      setArrows([]);
                      setNextCircleId(1);
                      setNextArrowId(1);
                    }}
                    disabled={isLoadingDb}
                    className="flex-1 rounded-xl uppercase text-xs"
                    style={{
                      backgroundColor: '#4A4A4A',
                      color: '#FFFFFF',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      letterSpacing: '0.08em',
                      fontFamily: 'IBM Plex Mono, monospace'
                    }}
                  >
                    연결 해제
                  </Button>
                </div>
              </div>

              {/* 관계타입 필터 */}
              {relationTypes.length > 0 && (
                <div className="space-y-3 p-4 rounded-xl border-2" style={{ 
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  backgroundColor: '#2A2A2A'
                }}>
                  <Label className="uppercase" style={{ 
                    color: '#FFFFFF', 
                    fontSize: '0.875rem', 
                    letterSpacing: '0.08em',
                    fontFamily: 'IBM Plex Mono, monospace',
                    display: 'block',
                    marginBottom: '0.5rem'
                  }}>
                    관계타입 필터
                  </Label>
                  
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                    {/* 전체 선택 */}
                    <div className="flex items-center space-x-2 p-2 rounded hover:bg-[#3A3A3A] transition-colors">
                      <input
                        type="checkbox"
                        id="filter-all"
                        checked={selectedRelationTypeIds === null}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRelationTypeIds(null); // 전체 선택
                          }
                        }}
                        className="w-4 h-4 rounded cursor-pointer"
                        style={{ accentColor: '#6A6A6A' }}
                      />
                      <Label 
                        htmlFor="filter-all"
                        className="cursor-pointer uppercase flex-1" 
                        style={{ 
                          color: '#FFFFFF', 
                          fontSize: '0.75rem', 
                          letterSpacing: '0.05em',
                          fontFamily: 'IBM Plex Mono, monospace'
                        }}
                      >
                        전체 ({relationTypes.length}개)
                      </Label>
                    </div>
                    
                    {/* 각 관계타입 */}
                    {relationTypes.map((rt) => (
                      <div key={rt.relationtype_id} className="flex items-center space-x-2 p-2 rounded hover:bg-[#3A3A3A] transition-colors">
                        <input
                          type="checkbox"
                          id={`filter-${rt.relationtype_id}`}
                          checked={selectedRelationTypeIds === null || selectedRelationTypeIds.includes(rt.relationtype_id)}
                          onChange={(e) => {
                            if (selectedRelationTypeIds === null) {
                              // 전체 선택 상태에서 하나를 선택하면 전체를 해제하고 선택한 것만 추가
                              setSelectedRelationTypeIds([rt.relationtype_id]);
                            } else {
                              if (e.target.checked) {
                                setSelectedRelationTypeIds([...selectedRelationTypeIds, rt.relationtype_id]);
                              } else {
                                const filtered = selectedRelationTypeIds.filter(id => id !== rt.relationtype_id);
                                // 모든 것을 해제하면 전체 선택으로
                                setSelectedRelationTypeIds(filtered.length > 0 ? filtered : null);
                              }
                            }
                          }}
                          className="w-4 h-4 rounded cursor-pointer"
                          style={{ accentColor: '#6A6A6A' }}
                        />
                        <Label 
                          htmlFor={`filter-${rt.relationtype_id}`}
                          className="cursor-pointer uppercase flex-1" 
                          style={{ 
                            color: '#FFFFFF', 
                            fontSize: '0.75rem', 
                            letterSpacing: '0.05em',
                            fontFamily: 'IBM Plex Mono, monospace'
                          }}
                        >
                          {rt.typename || `ID: ${rt.relationtype_id}`}
                        </Label>
                      </div>
                    ))}
                  </div>

                  {selectedRelationTypeIds !== null && selectedRelationTypeIds.length > 0 && (
                    <div className="mt-2 p-2 rounded text-xs" style={{ 
                      backgroundColor: '#1A1A1A',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontFamily: 'IBM Plex Mono, monospace'
                    }}>
                      {selectedRelationTypeIds.length}개 관계타입 선택됨
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmDialog && (
        <div 
          className="fixed inset-0 flex items-center justify-center" 
          style={{ 
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.7)'
          }}
          onClick={() => setDeleteConfirmDialog(null)}
        >
          <Card 
            className="w-96 shadow-2xl border-3 rounded-3xl" 
            style={{ 
              backgroundColor: '#4A4A4A', 
              borderColor: 'rgba(255, 255, 255, 0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="text-xl uppercase text-center" style={{ 
                color: '#FFFFFF', 
                fontFamily: 'League Spartan, sans-serif',
                letterSpacing: '0.1em',
                fontWeight: 800
              }}>
                삭제 확인
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-center" style={{ 
                color: '#FFFFFF',
                fontFamily: 'IBM Plex Mono, monospace',
                letterSpacing: '0.05em'
              }}>
                '{deleteConfirmDialog.circleName}' 해당 카드를 삭제하시겠습니까?
              </p>

              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ 
                backgroundColor: '#2A2A2A',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                border: '2px solid'
              }}>
                <Checkbox
                  id="dontShowAgain"
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setShowDeleteConfirmation(false);
                      localStorage.setItem('showDeleteConfirmation', 'false');
                    }
                  }}
                />
                <Label 
                  htmlFor="dontShowAgain" 
                  className="cursor-pointer text-sm"
                  style={{ 
                    color: '#FFFFFF',
                    fontFamily: 'IBM Plex Mono, monospace'
                  }}
                >
                  다시 보지 않기
                </Label>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setDeleteConfirmDialog(null)}
                  className="flex-1 rounded-xl uppercase"
                  style={{
                    backgroundColor: '#2A2A2A',
                    color: '#FFFFFF',
                    border: '2px solid rgba(255, 255, 255, 0.3)'
                  }}
                >
                  취소
                </Button>
                <Button
                  onClick={() => {
                    deleteCircle(deleteConfirmDialog.circleId);
                    setDeleteConfirmDialog(null);
                  }}
                  className="flex-1 rounded-xl uppercase"
                  style={{
                    backgroundColor: '#6A6A6A',
                    color: '#FFFFFF',
                    border: '2px solid rgba(255, 255, 255, 0.3)'
                  }}
                >
                  삭제
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 메모장 패널 */}
      <NotesPanel isOpen={notesPanelOpen} onToggle={() => setNotesPanelOpen(!notesPanelOpen)} />
    </div>
  );
}
