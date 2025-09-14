import React, { useEffect, useState, useCallback } from 'react';
import { MemoryRouter as Router, Routes, Route, Link } from 'react-router-dom';
// 일단 기본 그래프뷰로 되돌리고 나중에 고급 라이브러리 적용
// import ForceGraph2D from 'react-force-graph';
// import ForceGraph3D from 'react-force-graph/dist/forcegraph3d';
// D3는 react-force-graph에 내장되어 있어서 별도 import 불필요
import './App.css';

interface Project {
  project_id: string;
  project_name: string;
  createdat: string;
}

// --------------------------------------------
// 공통 조회용 테이블 컴포넌트
// --------------------------------------------
function GenericTable({ data }: { data: Record<string, unknown>[] }) {
  if (!data.length) return <p style={{ color: '#888' }}>데이터가 없습니다.</p>;
  const keys = Object.keys(data[0]);
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <thead>
        <tr>
          {keys.map((k) => (
            <th key={k} style={{ textAlign: 'left', borderBottom: '1px solid #555', padding: '4px', wordBreak:'break-all' }}>{k}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            {keys.map((k) => (
              <td key={k} style={{ padding: '4px', borderBottom: '1px solid #333', wordBreak: 'break-all' }}>
                {String(row[k] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// 프로젝트 관리 컴포넌트
function ProjectManage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectCards, setProjectCards] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // 모든 프로젝트 조회
  const fetchProjects = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('get-projects');
      if (result.success) {
        setProjects(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  // 특정 프로젝트의 카드들 조회
  const fetchProjectCards = async (projectId: string) => {
    try {
      const result = await window.electron.ipcRenderer.invoke('get-project-cards', projectId);
      if (result.success) {
        setProjectCards(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch project cards:', error);
    }
  };

  // 프로젝트 생성
  const createProject = async () => {
    if (!projectName.trim()) return;

    try {
      const result = await window.electron.ipcRenderer.invoke('create-project', projectName.trim());
      if (result.success) {
        setProjectName('');
        setShowCreateModal(false);
        fetchProjects();
      } else {
        alert(result.error || '프로젝트 생성에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('프로젝트 생성에 실패했습니다');
    }
  };

  // 프로젝트 수정
  const updateProject = async () => {
    if (!editingProject || !projectName.trim()) return;

    try {
      const result = await window.electron.ipcRenderer.invoke(
        'update-project',
        editingProject.project_id,
        projectName.trim()
      );
      if (result.success) {
        setProjectName('');
        setShowEditModal(false);
        setEditingProject(null);
        fetchProjects();
        // 선택된 프로젝트 업데이트
        if (selectedProject?.project_id === editingProject.project_id) {
          setSelectedProject({ ...editingProject, project_name: projectName.trim() });
        }
      } else {
        alert(result.error || '프로젝트 수정에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to update project:', error);
      alert('프로젝트 수정에 실패했습니다');
    }
  };

  // 프로젝트 삭제
  const deleteProject = async (project: Project) => {
    if (!confirm(`정말로 "${project.project_name}" 프로젝트를 삭제하시겠습니까?\n프로젝트에 속한 카드들은 "프로젝트 없음" 상태가 됩니다.`)) {
      return;
    }

    try {
      const result = await window.electron.ipcRenderer.invoke('delete-project', project.project_id);
      if (result.success) {
        fetchProjects();
        if (selectedProject?.project_id === project.project_id) {
          setSelectedProject(null);
          setProjectCards([]);
        }
      } else {
        alert(result.error || '프로젝트 삭제에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('프로젝트 삭제에 실패했습니다');
    }
  };

  // 프로젝트 선택
  const selectProject = (project: Project) => {
    setSelectedProject(project);
    fetchProjectCards(project.project_id);
  };

  // 수정 모달 열기
  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setProjectName(project.project_name);
    setShowEditModal(true);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <div style={{ height: '100vh', overflowY: 'auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>프로젝트 관리</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          새 프로젝트 추가
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 120px)' }}>
        {/* 프로젝트 목록 */}
        <div style={{ flex: '0 0 300px', border: '1px solid #333', borderRadius: '4px', padding: '10px' }}>
          <h3>프로젝트 목록 ({projects.length}개)</h3>
          <div style={{ maxHeight: 'calc(100% - 50px)', overflowY: 'auto' }}>
            {projects.map((project) => (
              <div
                key={project.project_id}
                style={{
                  padding: '12px',
                  margin: '8px 0',
                  border: selectedProject?.project_id === project.project_id ? '2px solid #4CAF50' : '1px solid #555',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: selectedProject?.project_id === project.project_id ? '#1a4d1a' : 'transparent'
                }}
                onClick={() => selectProject(project)}
              >
                <div style={{ fontWeight: 'bold' }}>{project.project_name}</div>
                <div style={{ fontSize: '0.8em', color: '#888', marginTop: '4px' }}>
                  카드: {(project as any).card_count || 0}개
                </div>
                <div style={{ fontSize: '0.7em', color: '#666' }}>
                  생성: {new Date(project.createdat).toLocaleDateString('ko-KR')}
                </div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(project);
                    }}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '2px',
                      fontSize: '0.8em',
                      cursor: 'pointer'
                    }}
                  >
                    수정
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProject(project);
                    }}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '2px',
                      fontSize: '0.8em',
                      cursor: 'pointer'
                    }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 선택된 프로젝트의 카드 목록 */}
        <div style={{ flex: '1', border: '1px solid #333', borderRadius: '4px', padding: '10px' }}>
          {selectedProject ? (
            <>
              <h3>"{selectedProject.project_name}" 프로젝트의 카드들 ({projectCards.length}개)</h3>
              <div style={{ maxHeight: 'calc(100% - 50px)', overflowY: 'auto' }}>
                {projectCards.length > 0 ? (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {projectCards.map((card) => (
                      <div
                        key={card.id}
                        style={{
                          padding: '12px',
                          border: '1px solid #555',
                          borderRadius: '4px',
                          backgroundColor: '#1a1a1a'
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                          {card.title}
                        </div>
                        {card.content && (
                          <div style={{ fontSize: '0.9em', color: '#ccc', marginBottom: '8px' }}>
                            {card.content.length > 100
                              ? `${card.content.substring(0, 100)}...`
                              : card.content
                            }
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.8em', color: '#888' }}>
                          <span>타입: {card.cardtype_name || '없음'}</span>
                          <span>관계: {card.relation_count || 0}개</span>
                          <span>생성: {new Date(card.createdat).toLocaleDateString('ko-KR')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#888', textAlign: 'center', marginTop: '50px' }}>
                    이 프로젝트에 카드가 없습니다.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', marginTop: '100px', color: '#888' }}>
              <h3>프로젝트를 선택하면 해당 프로젝트의 카드들을 볼 수 있습니다</h3>
            </div>
          )}
        </div>
      </div>

      {/* 프로젝트 생성 모달 */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#2a2a2a', padding: '30px', borderRadius: '8px',
            width: '400px', border: '1px solid #555'
          }}>
            <h3>새 프로젝트 만들기</h3>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="프로젝트 이름을 입력하세요"
              style={{
                width: '100%', padding: '12px', margin: '10px 0',
                backgroundColor: '#1a1a1a', color: 'white',
                border: '1px solid #555', borderRadius: '4px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createProject();
                if (e.key === 'Escape') {
                  setShowCreateModal(false);
                  setProjectName('');
                }
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setProjectName('');
                }}
                style={{
                  padding: '8px 16px', backgroundColor: '#666',
                  color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={createProject}
                style={{
                  padding: '8px 16px', backgroundColor: '#4CAF50',
                  color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                }}
                disabled={!projectName.trim()}
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 프로젝트 수정 모달 */}
      {showEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#2a2a2a', padding: '30px', borderRadius: '8px',
            width: '400px', border: '1px solid #555'
          }}>
            <h3>프로젝트 수정</h3>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="새 프로젝트 이름을 입력하세요"
              style={{
                width: '100%', padding: '12px', margin: '10px 0',
                backgroundColor: '#1a1a1a', color: 'white',
                border: '1px solid #555', borderRadius: '4px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') updateProject();
                if (e.key === 'Escape') {
                  setShowEditModal(false);
                  setProjectName('');
                  setEditingProject(null);
                }
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setProjectName('');
                  setEditingProject(null);
                }}
                style={{
                  padding: '8px 16px', backgroundColor: '#666',
                  color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={updateProject}
                style={{
                  padding: '8px 16px', backgroundColor: '#4CAF50',
                  color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                }}
                disabled={!projectName.trim()}
              >
                수정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [cards, setCards] = useState<{ id: string; title: string }[]>([]);
  const [cardTitle, setCardTitle] = useState('');

  const fetchProjects = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await window.electron.ipcRenderer.invoke(
      'get-projects',
    )) as any;
    if (result.success) {
      setProjects(result.data as Project[]);
    }
  };

  useEffect(() => {
    fetchProjects();
    // 초기 카드 로드
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = (await window.electron.ipcRenderer.invoke('get-cards')) as any;
      if (res.success) setCards(res.data as { id: string; title: string }[]);
    })();
  }, []);

  const createProject = async () => {
    if (!name.trim()) return;
    const newProject: Omit<Project, 'createdat'> = {
      project_id: Date.now().toString(),
      project_name: name,
    } as Project;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await window.electron.ipcRenderer.invoke(
      'create-project',
      newProject,
    )) as any;
    if (result.success) {
      setName('');
      fetchProjects();
    }
  };

  const createCard = async () => {
    if (!cardTitle.trim()) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = (await window.electron.ipcRenderer.invoke('create-card', {
      title: cardTitle.trim(),
    })) as any;
    if (res.success) {
      setCardTitle('');
      const updated = (await window.electron.ipcRenderer.invoke('get-cards')) as any;
      if (updated.success) setCards(updated.data as { id: string; title: string }[]);
    } else if(res.error === 'duplicate-title'){
      alert('동일한 제목의 카드가 이미 존재합니다');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Projects</h2>
      <div style={{ marginBottom: 10 }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New project name"
        />
        <button type="button" onClick={createProject} style={{ marginLeft: 8 }}>
          Add
        </button>
      </div>
      <ul>
        {projects.map((p) => (
          <li key={p.project_id}>
            {p.project_name} <span style={{ color: '#888' }}>({p.createdat})</span>
          </li>
        ))}
      </ul>

      {/* --- Cards ------------------------------------------- */}
      <hr style={{ margin: '24px 0' }} />
      <h2>Cards</h2>
      <div style={{ marginBottom: 10 }}>
        <input
          type="text"
          placeholder="New card title"
          value={cardTitle}
          onChange={(e) => setCardTitle(e.target.value)}
        />
        <button type="button" onClick={createCard} style={{ marginLeft: 8 }}>
          Add Card
        </button>
      </div>
      <ul>
        {cards.map((c) => (
          <li key={c.id} style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
            <span>{c.title}</span>
            <button
              style={{padding:'0 6px'}}
              onClick={async()=>{
                if(!window.confirm(`${c.title} 카드를 삭제할까요?`)) return;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const res = (await window.electron.ipcRenderer.invoke('delete-card', c.id)) as any;
                if(res.success) setCards(prev=>prev.filter(cc=>cc.id!==c.id));
              }}
            >삭제</button>
          </li>
        ))}
      </ul>

      {/* --- Relation input form --------------------------------- */}
      <hr style={{ margin: '24px 0' }} />
      {/* Relation form needs cards list to show dropdowns */}
      <RelationForm cards={cards} refreshCards={() => {
        window.electron.ipcRenderer.invoke('get-cards').then((r: any)=>{
          if(r.success) setCards(r.data as {id:string; title:string}[]);
        });
      }} />
    </div>
  );
}

// 빈 페이지 컴포넌트들
function Home() {
  const [cards, setCards] = useState<{ id: string; title: string; cardtype?: string | null }[]>([]);
  const [currentCardId,setCurrentCardId]=useState<string>('');
  const [relations, setRelations] = useState<{
    relation_id: number;
    relationtype_id: number;
    typename: string;
    target: string;
    target_title: string | null;
  }[]>([]);
  const [cardTypes, setCardTypes] = useState<any[]>([]);
  const [relationTypes, setRelationTypes] = useState<{ relationtype_id: number; typename: string; oppsite: string; set_value?: number }[]>([]);
  const [toast, setToast] = useState('');
  const [cardTypeInput, setCardTypeInput] = useState('');
  const [cardTitleInput, setCardTitleInput] = useState('');

  // Before/After 관계 충돌 모달 상태
  const [conflictModal, setConflictModal] = useState<{
    show: boolean;
    field: string;
    value: any;
    conflicts: any[];
  }>({ show: false, field: '', value: null, conflicts: [] });
  const [oppModal, setOppModal] = useState<{ show: boolean; typeName: string }>({ show: false, typeName: '' });
  const [oppositeInput, setOppositeInput] = useState('');
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [modalCardId, setModalCardId] = useState('');
  const [modalNewTitle, setModalNewTitle] = useState('');
  const [projects,setProjects]=useState<{project_id:string; project_name:string}[]>([]);
  const [cardDetail,setCardDetail]=useState<any|null>(null);
  // 새로운 관계타입 생성 후 이어서 관계를 만들기 위한 보류 정보
  const [pendingRelation,setPendingRelation] = useState<{sourceId:string; targetTitle:string; relTypeName:string}|null>(null);
  // 카드 정렬 및 필터링을 위한 상태 (localStorage에서 복원)
  const [sortByRelationType, setSortByRelationType] = useState<string>(() => {
    try {
      return localStorage.getItem('forneed-sort-relation-type') || 'all';
    } catch {
      return 'all';
    }
  });
  const [allRelations, setAllRelations] = useState<any[]>([]); // 모든 관계 데이터
  // 관계 내보내기 모달
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportText, setExportText] = useState('');
  // 현재 관계 목록에서 선택된 인덱스
  const [selectedRelationIndex, setSelectedRelationIndex] = useState<number>(-1);
  const [isRelationListFocused, setIsRelationListFocused] = useState(false);
  // 인라인 관계 추가 모드
  const [isAddingRelation, setIsAddingRelation] = useState(false);
  const [newRelationType, setNewRelationType] = useState('');
  const [newTargetCard, setNewTargetCard] = useState('');

  // 설정 관련 상태
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState({
    confirmDelete: true,
    exportTemplate: `아래 관계들을 검토하여 이 관계의 논리적 오류가 있는지 점검하고, 이를 기반으로 계획을 세워줘.

전체 관계 목록 (총 {relationCount}건)
{relationList}

시간정보가 있는 카드 목록{timeCardsCount}
{timeLegend}
{timeLines}`
  });

  // 왼쪽 패널 접기 상태
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);

  // localStorage에서 필터 설정 복원
  const loadFilterSettings = () => {
    try {
      const saved = localStorage.getItem('forneed-filter-settings');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('필터 설정 로드 실패:', error);
      return null;
    }
  };

  const savedFilters = loadFilterSettings();

  // 필터링 관련 상태
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [cardTypeFilters, setCardTypeFilters] = useState<string[]>(savedFilters?.cardTypeFilters || []);
  const [amountFilter, setAmountFilter] = useState({
    enabled: savedFilters?.amountFilter?.enabled || false,
    amount: savedFilters?.amountFilter?.amount || '',
    operator: savedFilters?.amountFilter?.operator || 'gte'
  });

  const [sortOptions, setSortOptions] = useState({
    relationCount: {
      enabled: savedFilters?.sortOptions?.relationCount?.enabled || false,
      relationTypes: savedFilters?.sortOptions?.relationCount?.relationTypes || [],
      order: savedFilters?.sortOptions?.relationCount?.order || 'desc'
    },
    amount: {
      enabled: savedFilters?.sortOptions?.amount?.enabled || false,
      order: savedFilters?.sortOptions?.amount?.order || 'desc'
    },
    completion: {
      enabled: savedFilters?.sortOptions?.completion?.enabled || false,
      order: savedFilters?.sortOptions?.completion?.order || 'incomplete-first'
    }
  });

  // 새로운 필터 상태
  const [relationFilter, setRelationFilter] = useState({
    enabled: savedFilters?.relationFilter?.enabled || false,
    type: savedFilters?.relationFilter?.type || 'no-relations'
  });
  const [dateFilter, setDateFilter] = useState({
    enabled: savedFilters?.dateFilter?.enabled || false,
    type: savedFilters?.dateFilter?.type || 'has-date'
  });

  // 서브카드 전용 정렬 필터 상태
  const [subcardsOnlyFilter, setSubcardsOnlyFilter] = useState({
    enabled: savedFilters?.subcardsOnlyFilter?.enabled || false,
    relationTypeName: savedFilters?.subcardsOnlyFilter?.relationTypeName || '',
    targetCardTitle: savedFilters?.subcardsOnlyFilter?.targetCardTitle || ''
  });

  // 서브카드 필터의 자동완성 관련 상태
  const [subcardsDropdownVisible, setSubcardsDropdownVisible] = useState(false);
  const [filteredSubcardsTargets, setFilteredSubcardsTargets] = useState<any[]>([]);
  const [subcardsSelectedIndex, setSubcardsSelectedIndex] = useState(-1);

  // 카드 검색 상태
  const [cardSearchTerm, setCardSearchTerm] = useState('');

  // 별칭 관련 상태
  const [aliases, setAliases] = useState<any[]>([]);
  const [cardAliases, setCardAliases] = useState<any[]>([]);
  const [aliasInput, setAliasInput] = useState('');

  // 자동완성 관련 상태
  const [sourceCardInput, setSourceCardInput] = useState('');
  const [targetCardInput, setTargetCardInput] = useState('');
  const [sourceDropdownVisible, setSourceDropdownVisible] = useState(false);
  const [targetDropdownVisible, setTargetDropdownVisible] = useState(false);
  const [sourceSelectedIndex, setSourceSelectedIndex] = useState(-1);
  const [targetSelectedIndex, setTargetSelectedIndex] = useState(-1);
  const [filteredSourceCards, setFilteredSourceCards] = useState<any[]>([]);
  const [filteredTargetCards, setFilteredTargetCards] = useState<any[]>([]);

  const loadCards = async () => {
    console.log('🃚 [loadCards] 시작');

    const res = (await window.electron.ipcRenderer.invoke('get-cards')) as any;

    console.log('🃚 [loadCards] IPC 응답:', { success: res.success, cardsCount: res.data?.length });

    if (res.success) {
      setCards(res.data as { id: string; title: string; cardtype?: string | null }[]);
      if (!currentCardId && res.data.length) {
        // nothing
      }
    }
  };

  const loadRelations = async (cardId: string) => {
    console.log('🔄 [loadRelations] 시작:', { cardId });

    // 현재관계창은 해당 카드가 source인 관계만 표시
    const cardRelations = allRelations.filter(rel => rel.source === cardId);

    console.log('🔄 [loadRelations] 결과:', {
      totalRelations: allRelations.length,
      filteredRelations: cardRelations.length,
      relations: cardRelations.map(r => ({
        id: r.relation_id,
        source: r.source,
        target: r.target,
        type: r.typename,
        source_title: r.source_title,
        target_title: r.target_title
      }))
    });

    setRelations(cardRelations);
  };

  // 모든 관계 로드
  const loadAllRelations = async () => {
    console.log('🔄 [loadAllRelations] 시작');

    const res = (await window.electron.ipcRenderer.invoke('get-relations')) as any;

    console.log('🔄 [loadAllRelations] IPC 응답:', { success: res.success, dataLength: res.data?.length });

    if (res.success) {
      setAllRelations(res.data);

      console.log('🔄 [loadAllRelations] 모든 관계:', res.data.map((r: any) => ({
        id: r.relation_id,
        source: r.source,
        target: r.target,
        type: r.typename,
        source_title: r.source_title,
        target_title: r.target_title
      })));

      // 현재 카드의 관계도 다시 로드 (source인 관계만)
      if (currentCardId) {
        const cardRelations = res.data.filter((rel: any) => rel.source === currentCardId);
        console.log('🔄 [loadAllRelations] 현재 카드 관계:', { currentCardId, relations: cardRelations });
        setRelations(cardRelations);
      }
    }
  };

  // 별칭 관련 함수들
  const loadAliases = async () => {
    const res = (await window.electron.ipcRenderer.invoke('get-aliases')) as any;
    if (res.success) {
      setAliases(res.data);
    }
  };

    const loadCardAliases = async (cardId: string) => {
    const res = (await window.electron.ipcRenderer.invoke('get-card-aliases', cardId)) as any;
    if (res.success) {
      setCardAliases(res.data);
    }
  };

  const addCardAlias = async () => {
    if (!currentCardId || !aliasInput.trim()) return;

    const res = (await window.electron.ipcRenderer.invoke('add-card-alias', {
      card_id: currentCardId,
      alias_name: aliasInput.trim()
    })) as any;

    if (res.success) {
      await loadCardAliases(currentCardId);
      await loadAliases(); // 새 별칭이 생성되었을 수 있으므로 목록 새로고침
      setAliasInput(''); // 입력 필드 초기화
      showToast('별칭이 추가되었습니다');
    } else if (res.error === 'duplicate') {
      showToast(res.message || '이미 있는 별칭입니다');
    } else {
      showToast('별칭 추가에 실패했습니다');
    }
  };

    const removeCardAlias = async (aliasId: number) => {
    if (!currentCardId) return;

    const res = (await window.electron.ipcRenderer.invoke('remove-card-alias', {
      card_id: currentCardId,
      alias_id: aliasId
    })) as any;

    if (res.success) {
      await loadCardAliases(currentCardId);
      showToast('별칭이 제거되었습니다');
    } else {
      showToast('별칭 제거에 실패했습니다');
    }
  };

  // 자동완성 관련 함수들
  const filterCards = (inputValue: string) => {
    if (!inputValue.trim()) return [];
    const searchTerm = inputValue.toLowerCase();
    return cards.filter(card =>
      card.title.toLowerCase().includes(searchTerm) ||
      (card.content && card.content.toLowerCase().includes(searchTerm))
    ).slice(0, 10); // 최대 10개까지만 표시
  };

  const handleSourceCardInputChange = (value: string) => {
    setSourceCardInput(value);
    const filtered = filterCards(value);
    setFilteredSourceCards(filtered);
    setSourceDropdownVisible(filtered.length > 0);
    setSourceSelectedIndex(-1);
  };

  const handleTargetCardInputChange = (value: string) => {
    setTargetCardInput(value);
    const filtered = filterCards(value);
    setFilteredTargetCards(filtered);
    setTargetDropdownVisible(filtered.length > 0);
    setTargetSelectedIndex(-1);
  };

  const selectSourceCard = (card: any) => {
    console.log('🎥 [selectSourceCard] 시작:', card);

    setSourceCardInput(card.title);
    setSourceDropdownVisible(false);
    setSourceSelectedIndex(-1);
    // Source card 선택 시 currentCardId 업데이트
    setCurrentCardId(card.id);
    setCardTitleInput(card.title);

    console.log('🔄 [selectSourceCard] 데이터 로드 시작:', { cardId: card.id, cardTitle: card.title });

    // 같은 카드를 다시 선택했을 때도 데이터 새로고침
    loadRelations(card.id);
    loadCardDetail(card.id);
    loadCardAliases(card.id);
  };

  const selectTargetCard = (card: any) => {
    setTargetCardInput(card.title);
    setTargetDropdownVisible(false);
    setTargetSelectedIndex(-1);
  };

  const handleSourceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      // Tab을 누르면 드롭다운을 닫고 다음 input으로 포커스 이동
      setSourceDropdownVisible(false);
      setSourceSelectedIndex(-1);
      return; // 기본 Tab 동작 허용
    }

    if (!sourceDropdownVisible) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSourceSelectedIndex(prev =>
          prev < filteredSourceCards.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSourceSelectedIndex(prev =>
          prev > 0 ? prev - 1 : filteredSourceCards.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (sourceSelectedIndex >= 0 && sourceSelectedIndex < filteredSourceCards.length) {
          selectSourceCard(filteredSourceCards[sourceSelectedIndex]);
        } else {
          // 드롭다운에서 선택하지 않고 Enter를 눌렀을 때, 입력된 텍스트로 카드 찾기
          const inputText = sourceCardInput.trim();
          if (inputText) {
            const matchedCard = cards.find(c =>
              c.title === inputText || c.id === inputText
            );
            if (matchedCard) {
              selectSourceCard(matchedCard);
            }
          }
        }
        break;
      case 'Escape':
        setSourceDropdownVisible(false);
        setSourceSelectedIndex(-1);
        break;
    }
  };

  const handleTargetKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      // Tab을 누르면 드롭다운을 닫고 다음 input으로 포커스 이동
      setTargetDropdownVisible(false);
      setTargetSelectedIndex(-1);
      return; // 기본 Tab 동작 허용
    }

    if (!targetDropdownVisible) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setTargetSelectedIndex(prev =>
          prev < filteredTargetCards.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setTargetSelectedIndex(prev =>
          prev > 0 ? prev - 1 : filteredTargetCards.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (targetSelectedIndex >= 0 && targetSelectedIndex < filteredTargetCards.length) {
          selectTargetCard(filteredTargetCards[targetSelectedIndex]);
        } else {
          // 선택된 항목이 없으면 관계 생성 실행
          handleCreateRelation();
        }
        break;
      case 'Escape':
        setTargetDropdownVisible(false);
        setTargetSelectedIndex(-1);
        break;
    }
  };

  // 카드별 관계 수 계산 (현재관계창과 동일: source인 관계만)
  const getRelationCount = (cardId: string) => {
    return allRelations.filter(rel => rel.source === cardId).length;
  };

  // 특정 관계타입의 관계 수 계산 (현재관계창과 동일: source인 관계만)
  const getRelationCountByType = (cardId: string, relationTypeName: string) => {
    return allRelations.filter(rel =>
      rel.source === cardId &&
      rel.typename === relationTypeName
    ).length;
  };

  // 서브카드 체인 필터링 로직: 특정 관계타입으로 target 카드에 연결되는 모든 카드들을 찾기
  const findCardsInChainToTarget = (targetCardTitle: string, relationTypeName: string): string[] => {
    if (!targetCardTitle || !relationTypeName) return [];

    // 목표 카드 찾기
    const targetCard = cards.find(card => card.title.toLowerCase() === targetCardTitle.toLowerCase());
    if (!targetCard) return [];

    const connectedCardIds = new Set<string>();

    // BFS를 사용해 역방향으로 체인을 따라가기
    const queue = [targetCard.id];
    const visited = new Set<string>([targetCard.id]);

    while (queue.length > 0) {
      const currentCardId = queue.shift()!;

      // 현재 카드로 향하는 지정된 관계타입의 모든 관계들 찾기
      const incomingRelations = allRelations.filter(rel =>
        rel.target === currentCardId &&
        rel.typename === relationTypeName
      );

      for (const relation of incomingRelations) {
        if (!visited.has(relation.source)) {
          visited.add(relation.source);
          connectedCardIds.add(relation.source);
          queue.push(relation.source);
        }
      }
    }

    return Array.from(connectedCardIds);
  };

  // 서브카드 필터의 카드 자동완성 필터링
  const filterSubcardsTargetCards = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredSubcardsTargets([]);
      setSubcardsDropdownVisible(false);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = cards
      .filter(card =>
        card.title.toLowerCase().includes(term) ||
        (card.content && card.content.toLowerCase().includes(term))
      )
      .slice(0, 10); // 최대 10개만 표시

    setFilteredSubcardsTargets(filtered);
    setSubcardsDropdownVisible(filtered.length > 0);
    setSubcardsSelectedIndex(-1);
  };

  // 서브카드 필터 키보드 핸들링
  const handleSubcardsKeyDown = (e: React.KeyboardEvent) => {
    if (!subcardsDropdownVisible || filteredSubcardsTargets.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSubcardsSelectedIndex(prev =>
          prev < filteredSubcardsTargets.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSubcardsSelectedIndex(prev =>
          prev > 0 ? prev - 1 : filteredSubcardsTargets.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (subcardsSelectedIndex >= 0 && subcardsSelectedIndex < filteredSubcardsTargets.length) {
          const selectedCard = filteredSubcardsTargets[subcardsSelectedIndex];
          setSubcardsOnlyFilter(prev => ({ ...prev, targetCardTitle: selectedCard.title }));
          setSubcardsDropdownVisible(false);
          setSubcardsSelectedIndex(-1);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setSubcardsDropdownVisible(false);
        setSubcardsSelectedIndex(-1);
        break;
    }
  };

  // 카드 정렬 및 필터링 함수
  const getSortedCards = () => {
    let filteredCards = [...cards];

    // 카드 검색 필터 적용
    if (cardSearchTerm.trim()) {
      const searchTerm = cardSearchTerm.toLowerCase().trim();
      filteredCards = filteredCards.filter(card =>
        card.title.toLowerCase().includes(searchTerm) ||
        (card.content && card.content.toLowerCase().includes(searchTerm))
      );
    }

    // 카드타입 필터 적용
    if (cardTypeFilters.length > 0) {
      filteredCards = filteredCards.filter(card => {
        const cardType = cardTypes.find(ct => ct.cardtype_id === card.cardtype);
        return cardType && cardTypeFilters.includes(cardType.cardtype_name);
      });
    }

    // 관계 필터 적용
    if (relationFilter.enabled) {
      filteredCards = filteredCards.filter(card => {
        const hasRelations = getRelationCount(card.id) > 0;
        return relationFilter.type === 'no-relations' ? !hasRelations : hasRelations;
      });
    }

    // 날짜 필터 적용
    if (dateFilter.enabled) {
      filteredCards = filteredCards.filter(card => {
        const hasDate = !!(card.startdate || card.enddate || card.es || card.ls);
        return dateFilter.type === 'has-date' ? hasDate : !hasDate;
      });
    }

    // 서브카드 전용 정렬 필터 적용
    if (subcardsOnlyFilter.enabled && subcardsOnlyFilter.relationTypeName && subcardsOnlyFilter.targetCardTitle) {
      const chainCardIds = findCardsInChainToTarget(subcardsOnlyFilter.targetCardTitle, subcardsOnlyFilter.relationTypeName);
      filteredCards = filteredCards.filter(card => chainCardIds.includes(card.id));
    }

    // 금액 필터 적용
    if (amountFilter.enabled && amountFilter.amount) {
      const filterAmount = parseFloat(amountFilter.amount);
      filteredCards = filteredCards.filter(card => {
        const cardAmount = parseFloat((card as any).amount || 0);
        if (amountFilter.operator === 'gte') {
          return cardAmount >= filterAmount;
        } else {
          return cardAmount <= filterAmount;
        }
      });
    }

    // 정렬 적용
    let sortedCards = [...filteredCards];

    // 보유관계 갯수 정렬이 활성화된 경우
    if (sortOptions.relationCount.enabled && sortOptions.relationCount.relationTypes.length > 0) {
      sortedCards.sort((a, b) => {
        let countA = 0, countB = 0;

        // 선택된 관계타입들의 관계 수를 합산
        sortOptions.relationCount.relationTypes.forEach(typeName => {
          countA += getRelationCountByType(a.id, typeName);
          countB += getRelationCountByType(b.id, typeName);
        });

        if (sortOptions.relationCount.order === 'desc') {
          return countB - countA; // 내림차순 (많은 것부터)
        } else {
          return countA - countB; // 오름차순 (적은 것부터)
        }
      });
    }
    // 금액순 정렬이 활성화된 경우
    else if (sortOptions.amount.enabled) {
      sortedCards.sort((a, b) => {
        const amountA = parseFloat((a as any).amount || 0);
        const amountB = parseFloat((b as any).amount || 0);

        if (sortOptions.amount.order === 'desc') {
          return amountB - amountA;
        } else {
          return amountA - amountB;
        }
      });
    }
    // 완료/미완료 정렬이 활성화된 경우
    else if (sortOptions.completion.enabled) {
      sortedCards.sort((a, b) => {
        const completeA = (a as any).complete || false;
        const completeB = (b as any).complete || false;

        if (sortOptions.completion.order === 'incomplete-first') {
          if (completeA === completeB) return 0;
          return completeA ? 1 : -1; // 미완료가 위로
        } else {
          if (completeA === completeB) return 0;
          return completeA ? -1 : 1; // 완료가 위로
        }
      });
    }
    // 기본 정렬 (기존 관계타입 정렬)
    else {
    if (sortByRelationType === 'all') {
      // 전체 관계 수로 정렬 (내림차순)
      sortedCards.sort((a, b) => getRelationCount(b.id) - getRelationCount(a.id));
    } else {
      // 특정 관계타입으로 정렬 (내림차순)
      sortedCards.sort((a, b) =>
        getRelationCountByType(b.id, sortByRelationType) - getRelationCountByType(a.id, sortByRelationType)
      );
      }
    }

    return sortedCards;
  };

  useEffect(() => {
    loadCards();
    loadAllRelations(); // 모든 관계 로드 추가
    loadAliases(); // 별칭 로드 추가
    // load cardtypes & relationtypes once
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ct = (await window.electron.ipcRenderer.invoke('get-cardtypes')) as any;
      if (ct.success) setCardTypes(ct.data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rt = (await window.electron.ipcRenderer.invoke('get-relationtypes')) as any;
      if (rt.success) setRelationTypes(rt.data);
      const pj = (await window.electron.ipcRenderer.invoke('get-projects')) as any;
      if(pj.success) setProjects(pj.data);
    })();
  }, []);

  // currentCardId 가 변경되면 상세/관계 정보 로드
  useEffect(() => {
    if (currentCardId) {
      loadRelations(currentCardId);
      loadCardDetail(currentCardId);
      loadCardAliases(currentCardId); // 별칭들 로드 추가
      // 현재 카드의 제목으로 소스 카드 입력 동기화
      const currentCard = cards.find(c => c.id === currentCardId);
      if (currentCard) {
        setSourceCardInput(currentCard.title);
      }
    } else {
      setRelations([]);
      setCardDetail(null);
      setCardAliases([]); // 별칭들 초기화
      setAliasInput('');
      setSourceCardInput(''); // 소스 카드 입력 초기화
    }
  }, [currentCardId, cards]);

  // sourceCardInput이 변경될 때 자동으로 해당 카드의 관계와 세부사항 조회
  useEffect(() => {
    if (sourceCardInput.trim()) {
      // 입력된 제목 또는 ID로 카드 찾기
      const matchedCard = cards.find(c =>
        c.title === sourceCardInput.trim() || c.id === sourceCardInput.trim()
      );

      if (matchedCard && matchedCard.id !== currentCardId) {
        // 찾은 카드가 현재 선택된 카드와 다르면 자동으로 선택
        setCurrentCardId(matchedCard.id);
        setCardTitleInput(matchedCard.title); // 제목도 동기화
      } else if (matchedCard && matchedCard.id === currentCardId) {
        // 같은 카드인 경우에도 관계와 세부사항을 다시 로드 (데이터 새로고침)
        loadRelations(matchedCard.id);
        loadCardDetail(matchedCard.id);
        loadCardAliases(matchedCard.id);
      }
    }
  }, [sourceCardInput]); // 무한 루프 방지를 위해 cards, currentCardId 의존성 제거

  useEffect(() => {
    if (currentCardId) {
      const title = cards.find((c) => c.id === currentCardId)?.title || '';
      if (title && cardTitleInput !== title) {
        setCardTitleInput(title);
      }
      const name = cardTypes.find((ct) => ct.cardtype_id === cards.find((c) => c.id === currentCardId)?.cardtype)?.cardtype_name || '';
      if (cardTypeInput !== name) setCardTypeInput(name);
    } else if(cardTitleInput!=='' || cardTypeInput!=='') {
      setCardTitleInput('');
      setCardTypeInput('');
    }
  }, [currentCardId, cards, cardTypes]);

  // 정렬 설정 변경 시 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem('forneed-sort-relation-type', sortByRelationType);
    } catch (error) {
      console.warn('localStorage 저장 실패:', error);
    }
  }, [sortByRelationType]);

  // 필터 설정 변경 시 localStorage에 저장
  useEffect(() => {
    try {
      const filterSettings = {
        sortOptions,
        relationFilter,
        dateFilter,
        subcardsOnlyFilter,
        amountFilter,
        cardTypeFilters
      };
      localStorage.setItem('forneed-filter-settings', JSON.stringify(filterSettings));
    } catch (error) {
      console.warn('필터 설정 저장 실패:', error);
    }
  }, [sortOptions, relationFilter, dateFilter, subcardsOnlyFilter, amountFilter, cardTypeFilters]);

  // Esc 키로 충돌 모달 닫기
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && conflictModal.show) {
        setConflictModal({ show: false, field: '', value: null, conflicts: [] });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [conflictModal.show]);

  // 관계 목록이 변경될 때 선택 상태 리셋
  useEffect(() => {
    if (!isAddingRelation) {
      setSelectedRelationIndex(-1);
    }
  }, [relations, isAddingRelation]);

  // 새로운 관계 추가 모드에서 Escape 키 핸들링
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isAddingRelation && e.key === 'Escape') {
        setIsAddingRelation(false);
        setNewRelationType('');
        setNewTargetCard('');
        setSelectedRelationIndex(-1);
      }
    };

    if (isAddingRelation) {
      document.addEventListener('keydown', handleGlobalKeyDown);
      return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }
  }, [isAddingRelation]);



  // 설정 불러오기
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('for-need-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.warn('설정 불러오기 실패:', error);
    }
  }, []);

  // 설정 저장하기
  useEffect(() => {
    try {
      localStorage.setItem('for-need-settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('설정 저장 실패:', error);
    }
  }, [settings]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // 키보드 단축키로 새 카드 생성
  const createCardWithShortcut = useCallback(async () => {
    // 고유한 기본 제목 생성
    const timestamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
    const defaultTitle = `새 카드 ${timestamp}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = (await window.electron.ipcRenderer.invoke('create-card', {
      title: defaultTitle,
    })) as any;

    if (res.success) {
      await loadCards();
      // 새로 생성된 카드를 선택하고 제목 편집 준비
      setCurrentCardId(res.data.id);
      setCardTitleInput(defaultTitle);
      showToast('새 카드가 생성되었습니다');
    } else if(res.error === 'duplicate-title'){
      showToast('카드 생성에 실패했습니다');
    }
  }, [loadCards]);

  // 키보드 단축키 처리 (cmd + n / ctrl + n으로 새 카드 생성)
  useEffect(() => {
    const handleKeyboardShortcuts = (event: KeyboardEvent) => {
      // cmd + n (macOS) 또는 ctrl + n (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
        event.preventDefault();
        createCardWithShortcut();
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [createCardWithShortcut]);

  // 선택 카드 제목 변경 (버튼)
  const editTitle = async () => {
    const current = cards.find((c) => c.id === currentCardId);
    if (!current) return;
    const newTitle = cardTitleInput.trim();
    if (!newTitle || newTitle === current.title) return;
    // 제목 중복 검사
    const dup = cards.find((c) => c.title === newTitle && c.id !== currentCardId);
    if (dup) {
      showToast('같은 제목의 카드가 이미 존재합니다');
      return;
    }
    const res = (await window.electron.ipcRenderer.invoke('update-card-title', {
      card_id: currentCardId,
      title: newTitle,
    })) as any;
    if (res.success) {
      await loadCards();
      showToast(`${current.title} 카드의 제목을 ${newTitle} 으로 변경 완료`);
    }
  };

  // ------------------------------------------------------------
  // 관계 생성 처리 함수
  // ------------------------------------------------------------
  const handleCreateRelation = async () => {
    console.log('🔧 [handleCreateRelation] 시작');

    // ------------------------------------------------
    // source card 확보 (새로운 자동완성 입력 기준)
    // ------------------------------------------------
    const sourceTitle = sourceCardInput.trim() || cardTitleInput.trim();
    console.log('🔧 [handleCreateRelation] sourceTitle:', sourceTitle);

    if (!sourceTitle) {
      console.log('⚠️ [handleCreateRelation] sourceTitle 누락');
      showToast('먼저 소스 카드를 입력하세요');
      return;
    }

    let sourceId: string | undefined;
    const srcExists = cards.find((c) => c.title === sourceTitle || c.id === sourceTitle);
    if (srcExists) {
      sourceId = srcExists.id;
    } else {
      const created = (await window.electron.ipcRenderer.invoke('create-card', { title: sourceTitle })) as any;
              if (created.success) {
          sourceId = created.data.id;
          if (sourceId) setCurrentCardId(sourceId);
          await loadCards();
        } else if (created.error === 'duplicate-title') {
          // theoretically not reached due to earlier search but safe guard
          const dup = (cards.find((c)=>c.title===sourceTitle) || {}) as any;
          if (dup.id) {
            sourceId = dup.id;
            if (sourceId) setCurrentCardId(sourceId);
          }
        }
    }

    if (!sourceId) return;

    // relation type id 확보
    let relationTypeId: number | undefined;
    const relationTypeInput = (document.getElementById('relationTypeInput') as HTMLInputElement).value.trim();
    const rtExists = relationTypes.find((rt) => rt.typename === relationTypeInput);
    if (rtExists) {
      relationTypeId = rtExists.relationtype_id;
    } else {
      // 관계 타입이 없으면 모달을 띄워 반대 관계명을 입력받고, 이후 자동으로 이어서 처리
      setOppModal({ show: true, typeName: relationTypeInput });
      // 관계 생성 재호출을 위해 정보 보관
      setPendingRelation({sourceId, targetTitle: targetCardInput.trim(), relTypeName: relationTypeInput});
      return;
    }

    // target card id 확보
    const targetTitle = targetCardInput.trim();
    if (!targetTitle) {
      showToast('대상 카드를 입력하세요');
      return;
    }

    let targetId: string | undefined;
    const cardExists = cards.find((c) => c.title === targetTitle || c.id === targetTitle);
    if (cardExists) {
      targetId = cardExists.id;
    } else {
      const res = (await window.electron.ipcRenderer.invoke('create-card', { title: targetTitle })) as any;
      if (res.success) {
        targetId = res.data.id;
        await loadCards();
      }
    }

    if (relationTypeId && targetId) {
      console.log('🔧 [handleCreateRelation] 관계 생성 시작:', {
        sourceId,
        targetId,
        relationTypeId,
        sourceTitle: sourceTitle,
        targetTitle: targetCardInput
      });

      // Source와 Target이 같은 경우 방지
      if (sourceId === targetId) {
        console.log('⚠️ [handleCreateRelation] 자기 자신과의 관계 방지');
        showToast('자기 자신과의 관계는 만들 수 없습니다');
        return;
      }

      const res = (await window.electron.ipcRenderer.invoke('create-relation', {
        relationtype_id: relationTypeId,
        source: sourceId,
        target: targetId,
      })) as any;

      console.log('🔧 [handleCreateRelation] IPC 응답:', res);

      if (res.success) {
        console.log('✅ [handleCreateRelation] 관계 생성 성공');

        // relationTypeInput 유지
        setTargetCardInput('');
        setTargetDropdownVisible(false);
        setTargetSelectedIndex(-1);
        setOppModal({ show: false, typeName: '' });

        console.log('🔄 [handleCreateRelation] 관계 데이터 새로고침 시작');
        await loadRelations(sourceId);
        await loadAllRelations(); // 모든 관계 목록도 새로고침

        showToast('관계 생성 완료');
      } else {
        console.error('❌ [handleCreateRelation] 관계 생성 실패:', res);
        showToast('관계 생성에 실패했습니다');
      }
    } else {
      console.log('⚠️ [handleCreateRelation] 필수 데이터 누락:', { relationTypeId, targetId });
    }
  };

  // 카드 상세 정보 로드
  const loadCardDetail = async(id:string)=>{
    if(!id) {setCardDetail(null); return;}
    const res = await window.electron.ipcRenderer.invoke('get-card-detail',id) as any;
    if(res.success) setCardDetail(res.data);
  };

  // generic field update handler
  const updateCardField = async(field:string,value:any)=>{
    if(!currentCardId) return;
    const addDays = (dateStr:string,days:number)=>{
      const d=new Date(dateStr);
      d.setDate(d.getDate()+days);
      return d.toISOString().slice(0,10);
    };
    const subDays=(dateStr:string,days:number)=>addDays(dateStr,-days);

    // 임시로 UI 업데이트
    setCardDetail((prev:any)=>({...prev,[field]:value}));

    // 백엔드 업데이트 시도
    const res = await window.electron.ipcRenderer.invoke('update-card-field',{card_id:currentCardId,field,value}) as any;

    // Before/After 관계 충돌 검사
    if (!res.success && res.error === 'before_after_conflict') {
      // UI를 원래 상태로 되돌림
      await loadCardDetail(currentCardId);

      // 충돌 모달 표시
      setConflictModal({
        show: true,
        field,
        value,
        conflicts: res.conflictCards || []
      });
      return;
    }

    if (!res.success) {
      // 다른 에러의 경우 원래 상태로 되돌림
      await loadCardDetail(currentCardId);
      showToast('카드 업데이트에 실패했습니다');
      return;
    }

    if(field==='title'){
      setCardTitleInput(value as string);
      // 로컬 cards 상태 업데이트
      setCards(prev=>prev.map(c=>c.id===currentCardId?{...c,title:value}:c));
    }

    if(field==='cardtype'){
      setCards(prev=>prev.map(c=>c.id===currentCardId?{...c,cardtype:value}:c));
    }

    // duration 수정 시 ES/LS 계산
    if(field==='duration'){
      const durNum = Number(value);
      if(!Number.isNaN(durNum) && durNum>0){
        const esVal = cardDetail?.es;
        const lsVal = cardDetail?.ls;
        if(esVal){
          const lsNew = addDays(esVal,durNum);
          setCardDetail((prev:any)=>({...prev,ls:lsNew}));
          await window.electron.ipcRenderer.invoke('update-card-field',{card_id:currentCardId,field:'ls',value:lsNew});
        } else if(lsVal){
          const esNew = subDays(lsVal,durNum);
          setCardDetail((prev:any)=>({...prev,es:esNew}));
          await window.electron.ipcRenderer.invoke('update-card-field',{card_id:currentCardId,field:'es',value:esNew});
        }
      }
    }

    // ---------------------------------------------------
    // 날짜 입력 유효성 검사 (ES/LS 범위)
    // ---------------------------------------------------
    const esCurrent = (field==='es'? value : cardDetail?.es);
    const lsCurrent = (field==='ls'? value : cardDetail?.ls);

    if((field==='startdate' || field==='enddate') && typeof value==='string'){
      const dateVal = value;
      const esOk = esCurrent? (new Date(dateVal) >= new Date(esCurrent)) : true;
      const lsOk = lsCurrent? (new Date(dateVal) <= new Date(lsCurrent)) : true;
      if(!esOk || !lsOk){
        showToast('시작/종료일은 ES~LS 범위 내여야 합니다');
        // revert value
        setCardDetail((prev:any)=>({...prev,[field]:prev[field]}));
        return;
      }
    }
  };

  // 카드타입 저장 (세부사항 패널에서 호출)
  const saveCardType = async () => {
    const name = cardTypeInput.trim();
    if (!name || !currentCardId) return;
    let targetId = '';
    const exists = cardTypes.find((ct) => ct.cardtype_name === name);
    if (exists) {
      targetId = exists.cardtype_id;
    } else {
      const res = (await window.electron.ipcRenderer.invoke('create-cardtype', { name })) as any;
      if (res.success) {
        targetId = res.data.id || res.data.cardtype_id;
        const ct = (await window.electron.ipcRenderer.invoke('get-cardtypes')) as any;
        if (ct.success) setCardTypes(ct.data);
      }
    }
    if (targetId) {
      await window.electron.ipcRenderer.invoke('update-cardtype', { card_id: currentCardId, cardtype: targetId });
      setCardDetail((prev:any)=>({...prev,cardtype:targetId}));
      setCards(prev=>prev.map(c=>c.id===currentCardId?{...c,cardtype:targetId}:c));
      setCardTypeInput(name);
    }
  };

  // 관계 내보내기 텍스트 생성 함수
  const generateExportText = async () => {
    const res = await window.electron.ipcRenderer.invoke('get-relations') as any;
    if(!res.success || res.data.length===0){
      showToast('관계가 없습니다');
      return '';
    }

    const relArr = res.data as any[];

    // 같은 쌍의 관계들을 그룹화
    const processedRelations = new Set<string>();
    const relationGroups: string[] = [];

    for (const rel of relArr) {
      const relId = `${rel.source}-${rel.target}-${rel.relationtype_id}`;

      if (processedRelations.has(relId)) continue;

      // 현재 관계와 반대 방향 관계들 찾기
      const pairRelations = relArr.filter(r =>
        (r.source === rel.source && r.target === rel.target) ||
        (r.source === rel.target && r.target === rel.source)
      );

      if (pairRelations.length > 1) {
        // 쌍이 있는 경우: 그룹으로 묶기
        const groupLines = pairRelations.map(r =>
          `- ${r.source_title ?? r.source} ${r.typename} ${r.target_title ?? r.target}`
        );
        relationGroups.push(groupLines.join('\n'));

        // 처리된 관계들 마킹
        pairRelations.forEach(r => {
          processedRelations.add(`${r.source}-${r.target}-${r.relationtype_id}`);
        });
      } else {
        // 단독 관계
        relationGroups.push(`- ${rel.source_title ?? rel.source} ${rel.typename} ${rel.target_title ?? rel.target}`);
        processedRelations.add(relId);
      }
    }

    const list = relationGroups.join('\n---\n');

    // 시간 정보 수집
    const idSet = new Set<string>();
    relArr.forEach(r=>{ idSet.add(r.source); idSet.add(r.target); });
    const timeLines: string[] = [];
    const legend = "ES: 빠르면 이때 시작 가능 | LS: 늦으면 이때 시작 가능 | 예정: 실제 시작/종료 예정일";

    for(const id of idSet){
      const det = await window.electron.ipcRenderer.invoke('get-card-detail',id) as any;
      if(det.success){
        const c = det.data;
        const es = c.es?.slice(0,10);
        const ls = c.ls?.slice(0,10);
        const sd = c.startdate?.slice(0,10);
        const ed = c.enddate?.slice(0,10);
        const parts:string[]=[];
        if(es) parts.push(`ES: ${es}`);
        if(ls) parts.push(`LS: ${ls}`);
        if(sd||ed){
          const p = `예정: ${sd||''}${(sd&&ed)?'~':''}${ed||''}`;
          parts.push(p);
        }
        if(parts.length) timeLines.push(`- ${c.title} | ${parts.join(' | ')}`);
      }
    }

    // 현재 일시 생성
    const currentDateTime = new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // 설정의 템플릿 사용
    const template = settings.exportTemplate
      .replace('{currentDateTime}', currentDateTime)
      .replace('{sleepStartTime}', (settings as any).sleepStartTime || '23:00')
      .replace('{sleepEndTime}', (settings as any).sleepEndTime || '07:00')
      .replace('{sleepDuration}', (settings as any).sleepDuration || '8시간')
      .replace('{relationCount}', relArr.length.toString())
      .replace('{relationList}', list)
      .replace('{timeCardsCount}', timeLines.length ? ` (총 ${timeLines.length}건)` : '')
      .replace('{timeLegend}', legend)
      .replace('{timeLines}', timeLines.join('\n'));

    return template;
  };

  // 새로운 관계 저장 함수
  const saveNewRelation = async () => {
    if (!currentCardId || !newRelationType.trim() || !newTargetCard.trim()) {
      showToast('관계타입과 대상 카드를 입력하세요');
      return;
    }

    try {
      // 관계타입 ID 찾기
      const relationType = relationTypes.find(rt => rt.typename === newRelationType);
      if (!relationType) {
        showToast('유효하지 않은 관계타입입니다');
        return;
      }

      // 대상 카드 ID 찾기 또는 생성
      let targetId = '';
      const existingCard = cards.find(c => c.title === newTargetCard || c.id === newTargetCard);

      if (existingCard) {
        targetId = existingCard.id;
      } else {
        // 새 카드 생성
        const createRes = await window.electron.ipcRenderer.invoke('create-card', { title: newTargetCard }) as any;
        if (createRes.success) {
          targetId = createRes.data.id;
          await loadCards();
        } else {
          showToast('대상 카드 생성에 실패했습니다');
          return;
        }
      }

      // 관계 생성
      const relationRes = await window.electron.ipcRenderer.invoke('create-relation', {
        relationtype_id: relationType.relationtype_id,
        source: currentCardId,
        target: targetId
      }) as any;

            if (relationRes.success) {
        // 성공 시 입력 필드만 초기화하고 추가 모드는 유지
        setNewRelationType(relationTypes[0]?.typename || '');
        setNewTargetCard('');

        // 관계 목록 새로고침
        await loadRelations(currentCardId);
        await loadAllRelations();

        showToast('새로운 관계가 추가되었습니다');

        // 관계타입 입력 필드에 다시 포커스
        setTimeout(() => {
          const typeInput = document.querySelector('.relation-type-input') as HTMLInputElement;
          if (typeInput) typeInput.focus();
        }, 100);
      } else {
        showToast('관계 생성에 실패했습니다');
      }
    } catch (error) {
      console.error('관계 저장 실패:', error);
      showToast('관계 저장 중 오류가 발생했습니다');
    }
  };

  // 관계 삭제 함수
  const deleteCurrentRelation = async (relation: any) => {
    console.log('🗑️ [deleteCurrentRelation] 시작:', relation);

    try {
      const res = await window.electron.ipcRenderer.invoke('delete-relation', relation.relation_id);
      console.log('🗑️ [deleteCurrentRelation] IPC 응답:', res);

      // 관계 목록 새로고침
      console.log('🔄 [deleteCurrentRelation] 관계 데이터 새로고침 시작');
      await loadRelations(currentCardId);
      await loadAllRelations();

      // 선택 인덱스 조정
      setSelectedRelationIndex(prev => {
        const newLength = relations.length - 1;
        if (prev >= newLength) return Math.max(0, newLength - 1);
        return prev;
      });

      console.log('✅ [deleteCurrentRelation] 관계 삭제 성공');
      showToast('관계가 삭제되었습니다');
    } catch (error) {
      console.error('❌ [deleteCurrentRelation] 관계 삭제 실패:', error);
      showToast('관계 삭제에 실패했습니다');
    }
  };

  // 관계타입 변경 함수
  const changeRelationType = async (relation: any, newRelationTypeId: number) => {
    try {
      // 기존 관계 삭제
      await window.electron.ipcRenderer.invoke('delete-relation', relation.relation_id);

      // 새로운 관계 생성
      await window.electron.ipcRenderer.invoke('create-relation', {
        relationtype_id: newRelationTypeId,
        source: currentCardId,
        target: relation.target
      });

      // 관계 목록 새로고침
      await loadRelations(currentCardId);
      await loadAllRelations();
      showToast('관계타입이 변경되었습니다');
    } catch (error) {
      console.error('관계타입 변경 실패:', error);
      showToast('관계타입 변경에 실패했습니다');
    }
  };

  // 카드 삭제 함수
  const deleteCard = async (id: string, title: string) => {
    if (settings.confirmDelete && !window.confirm(`${title} 카드를 삭제할까요?`)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = (await window.electron.ipcRenderer.invoke('delete-card', id)) as any;
    if (res.success) {
      showToast(`${title} 카드 삭제 완료`);
      if (id === currentCardId) {
        setCardTitleInput('');
        setCurrentCardId('');
        setCardDetail(null);
        setRelations([]);
      }
      loadCards();
      loadAllRelations(); // 관계 목록도 새로고침
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* 좌측 카드 리스트 */}
      <aside style={{
        width: isLeftCollapsed ? 40 : 250,
        borderRight: '1px solid #ccc',
        overflowY: 'auto',
        transition: 'width 0.3s ease',
        background: '#1b1b1b'
      }}>
        <div style={{
          padding: isLeftCollapsed ? '8px 4px' : 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid #333'
        }}>
          <button
            onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
            style={{
              padding: '4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isLeftCollapsed ? '펼치기' : '접기'}
          >
            {isLeftCollapsed ? '▶' : '◀'}
          </button>
          {!isLeftCollapsed && (
            <>
              <h3 style={{ margin: 0, flex: 1, color: '#fff' }}>Cards</h3>
              <button
                onClick={() => setShowFilterModal(true)}
                style={{
                  padding: '6px',
                  fontSize: 14,
                  background: '#333',
                  color: '#ccc',
                  border: '1px solid #555',
                  borderRadius: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="필터링 옵션"
              >
                ⚙️
              </button>
            </>
          )}
        </div>

        {/* 카드 검색 영역 */}
        {!isLeftCollapsed && (
          <div style={{
            padding: '12px',
            borderBottom: '1px solid #333'
          }}>
            <input
              type="text"
              placeholder="카드 검색..."
              value={cardSearchTerm}
              onChange={(e) => setCardSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: 4,
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
            {cardSearchTerm && (
              <div style={{
                marginTop: 8,
                fontSize: 12,
                color: '#888',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>검색 결과: {getSortedCards().length}개</span>
                <button
                  onClick={() => setCardSearchTerm('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    fontSize: 12
                  }}
                  title="검색 지우기"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

        {/* 서브카드 필터링 상태 표시 */}
        {!isLeftCollapsed && subcardsOnlyFilter.enabled && subcardsOnlyFilter.relationTypeName && subcardsOnlyFilter.targetCardTitle && (
          <div style={{
            padding: '12px',
            borderBottom: '1px solid #333',
            background: '#2a2a2a',
            borderLeft: '4px solid #4CAF50'
          }}>
            <div style={{
              fontSize: 12,
              color: '#4CAF50',
              marginBottom: 4,
              fontWeight: 'bold'
            }}>
              하위카드만 조회 활성화
            </div>
            <div style={{
              fontSize: 13,
              color: '#ccc',
              marginBottom: 8,
              lineHeight: 1.4
            }}>
              <span style={{ color: '#888' }}>기준:</span>
              <span style={{ color: '#ffa726', fontWeight: 'bold' }}>{subcardsOnlyFilter.relationTypeName}</span>
              {' → '}
              <span
                style={{
                  color: '#4CAF50',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textDecorationStyle: 'dotted'
                }}
                onClick={() => {
                  setSourceCardInput(subcardsOnlyFilter.targetCardTitle);
                  // 해당 카드 ID 찾기
                  const targetCard = cards.find(card => card.title === subcardsOnlyFilter.targetCardTitle);
                  if (targetCard) {
                    setCurrentCardId(targetCard.id);
                    loadRelations(targetCard.id);
                    loadCardDetail(targetCard.id);
                    loadCardAliases(targetCard.id);
                  }
                }}
                title="클릭하여 src 카드로 설정"
              >
                {subcardsOnlyFilter.targetCardTitle}
              </span>
            </div>
            <div style={{
              fontSize: 11,
              color: '#888',
              fontStyle: 'italic'
            }}>
              위 목표 카드를 향한 관계 체인의 카드들만 표시 중
            </div>
          </div>
        )}

        {!isLeftCollapsed && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {getSortedCards().map((c) => {
            const relationCount = sortByRelationType === 'all'
              ? getRelationCount(c.id)
              : getRelationCountByType(c.id, sortByRelationType);
            return (
            <li
              key={c.id}
              style={{
                padding: '6px 12px',
                display:'flex',
                justifyContent:'space-between',
                gap:8,
                cursor: 'pointer',
                background: (cardTitleInput.trim()!=='' && cardTitleInput.trim()===c.title) ? '#444' : 'transparent',
              }}
              onClick={() => {
                setCardTitleInput(c.title);
                setCurrentCardId(c.id);
                setSourceCardInput(c.title);
                // 강제로 데이터 새로고침
                loadRelations(c.id);
                loadCardDetail(c.id);
                loadCardAliases(c.id);
              }}
            >
              <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
                <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.title}</span>
                <span style={{fontSize:'11px',color:'#888'}}>
                  {sortByRelationType === 'all' ? `관계 ${relationCount}개` : `${sortByRelationType} ${relationCount}개`}
                </span>
              </div>
              <button
                style={{padding:'0 6px'}}
                onClick={(e)=>{e.stopPropagation(); deleteCard(c.id,c.title);}}
                title="삭제"
              >✕</button>
            </li>
            );
          })}
        </ul>
        )}
      </aside>

      {/* 중앙 편집기 */}
      <section className="editor">
        <h3>카드 편집</h3>

        {/* 관계 생성 영역 */}
        <div className="editor-row">
          {/* 소스 카드 자동완성 */}
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              placeholder="소스 카드 (현재: 카드 제목)"
              className="editor-input"
              value={sourceCardInput}
              onChange={(e) => handleSourceCardInputChange(e.target.value)}
              onKeyDown={handleSourceKeyDown}
              onFocus={() => {
                setIsRelationListFocused(false);
                setSelectedRelationIndex(-1);
                if (sourceCardInput && !sourceDropdownVisible) {
                  const filtered = filterCards(sourceCardInput);
                  setFilteredSourceCards(filtered);
                  setSourceDropdownVisible(filtered.length > 0);
                }
              }}
              onBlur={() => {
                // 약간의 지연을 두어 드롭다운 항목 클릭이 가능하도록 함
                setTimeout(() => setSourceDropdownVisible(false), 150);
              }}
            />
            {sourceDropdownVisible && filteredSourceCards.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#000000',
                border: '1px solid #444',
                borderTop: 'none',
                maxHeight: 200,
                overflowY: 'auto',
                zIndex: 1000,
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                {filteredSourceCards.map((card, index) => (
                  <div
                    key={card.id}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      backgroundColor: index === sourceSelectedIndex ? '#333333' : '#000000',
                      borderBottom: '1px solid #444',
                      color: '#ffffff'
                    }}
                    onMouseDown={() => selectSourceCard(card)}
                    onMouseEnter={() => setSourceSelectedIndex(index)}
                  >
                    {card.title}
                  </div>
                ))}
              </div>
            )}
          </div>

          <input
            list="relationTypeOptions"
            placeholder="관계타입"
            className="editor-input"
            id="relationTypeInput"
            onFocus={() => {
              setIsRelationListFocused(false);
              setSelectedRelationIndex(-1);
            }}
          />

          {/* 대상 카드 자동완성 */}
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              placeholder="대상 카드 제목"
              className="editor-input"
              value={targetCardInput}
              onChange={(e) => handleTargetCardInputChange(e.target.value)}
              onKeyDown={handleTargetKeyDown}
              onFocus={() => {
                setIsRelationListFocused(false);
                setSelectedRelationIndex(-1);
                if (targetCardInput && !targetDropdownVisible) {
                  const filtered = filterCards(targetCardInput);
                  setFilteredTargetCards(filtered);
                  setTargetDropdownVisible(filtered.length > 0);
                }
              }}
              onBlur={() => {
                // 약간의 지연을 두어 드롭다운 항목 클릭이 가능하도록 함
                setTimeout(() => setTargetDropdownVisible(false), 150);
              }}
            />
            {targetDropdownVisible && filteredTargetCards.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#000000',
                border: '1px solid #444',
                borderTop: 'none',
                maxHeight: 200,
                overflowY: 'auto',
                zIndex: 1000,
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                {filteredTargetCards.map((card, index) => (
                  <div
                    key={card.id}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      backgroundColor: index === targetSelectedIndex ? '#333333' : '#000000',
                      borderBottom: '1px solid #444',
                      color: '#ffffff'
                    }}
                    onMouseDown={() => selectTargetCard(card)}
                    onMouseEnter={() => setTargetSelectedIndex(index)}
                  >
                    {card.title}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleCreateRelation}
            className="editor-button"
            tabIndex={-1}
          >
            관계생성
          </button>
          <datalist id="relationTypeOptions">
            {relationTypes.map((rt) => (
              <option key={rt.relationtype_id} value={rt.typename} />
            ))}
          </datalist>
          <datalist id="cardOptions">
            {cards.map((c) => (
              <option key={c.id} value={c.title} />
            ))}
          </datalist>
        </div>

        {/* 현재 관계 목록 */}
        <h4 className="editor-section-title" style={{margin:0}}>현재 관계</h4>
        {/* 내보내기 버튼은 별도 섹션으로 이동 */}

        {/* 관계 목록 실제 표시 */}
        <div style={{marginTop:8}}>
                    <ul
            style={{
              listStyle:'none',
              padding:0,
              maxHeight:160,
              overflowY:'auto',
              border:'1px solid #444',
              cursor: 'pointer'
            }}
          >
            {relations.length===0 && !isAddingRelation ? (
              <li style={{padding:4,color:'#888'}}>관계가 없습니다.</li>
            ) : (
              <>
                {relations.sort((a, b) => a.relationtype_id - b.relationtype_id).map((r, index) => (
                  <li
                    key={r.relation_id}
                    style={{
                      display:'flex',
                      gap:8,
                      padding:'4px 8px',
                      borderBottom:'1px solid #333',
                      background: 'transparent',
                      color: 'inherit',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{
                      fontWeight:600,
                      minWidth: 60,
                      opacity: 0.9
                    }}>
                      {r.typename}
                    </span>
                    <span
                      style={{
                      flex:1,
                      whiteSpace:'nowrap',
                      overflow:'hidden',
                        textOverflow:'ellipsis',
                        cursor:'pointer'
                      }}
                      title={`클릭하여 ${r.target_title ?? r.target} 카드로 이동`}
                      onClick={()=>{
                        const tgtTitle = r.target_title || r.target;
                        setCardTitleInput(tgtTitle);
                        setCurrentCardId(r.target);
                      }}
                    >
                      {r.target_title ?? r.target}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCurrentRelation(r);
                      }}
                      style={{
                        background: '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 3,
                        padding: '2px 6px',
                        fontSize: 11,
                        cursor: 'pointer',
                        minWidth: 'auto',
                        flexShrink: 0
                      }}
                      title="관계 삭제"
                    >
                      ×
                    </button>
                  </li>
                ))}

                {/* 새로운 관계 추가 모드 */}
                {isAddingRelation && (
                  <li style={{
                    display:'flex',
                    gap:8,
                    padding:'4px 8px',
                    borderBottom:'1px solid #333',
                    background:'#1a4a1a',
                    border: '1px solid #4CAF50'
                  }}>
                    <input
                      className="relation-type-input"
                      value={newRelationType}
                      onChange={(e) => setNewRelationType(e.target.value)}
                      style={{
                        minWidth: 60,
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 14,
                        outline: 'none'
                      }}
                      placeholder="관계타입"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          saveNewRelation();
                        } else if (e.key === 'Tab') {
                          e.preventDefault();
                          // 대상 카드 입력으로 포커스 이동
                          const targetInput = e.currentTarget.parentElement?.querySelector('input:last-of-type') as HTMLInputElement;
                          if (targetInput) targetInput.focus();
                        }
                      }}
                    />
                    <input
                      value={newTargetCard}
                      onChange={(e) => setNewTargetCard(e.target.value)}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        fontSize: 14,
                        outline: 'none'
                      }}
                      placeholder="대상 카드 제목"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          saveNewRelation();
                        } else if (e.key === 'Tab') {
                          e.preventDefault();
                          // 관계타입 입력으로 포커스 이동
                          const typeInput = e.currentTarget.parentElement?.querySelector('input:first-of-type') as HTMLInputElement;
                          if (typeInput) typeInput.focus();
                        }
                      }}
                    />
                    <div style={{fontSize:10,color:'#4CAF50',display:'flex',flexDirection:'column',alignItems:'flex-end'}}>
                      <span>Enter: 저장→다음</span>
                      <span>Esc: 종료</span>
                    </div>
                  </li>
                )}
              </>
            )}
          </ul>
        </div>
        {/* --- 모든 관계 내보내기 큰 버튼 ---------------------------------- */}
        <div style={{margin:'16px 0'}}>
          <button
            style={{width:'100%',padding:'10px 0',fontSize:16,fontWeight:600,background:'#555',color:'#fff',border:'none',borderRadius:4,cursor:'pointer'}}
            onClick={async()=>{
              const text = await generateExportText();
              if (text) {
                try {
                  await navigator.clipboard.writeText(text);
                  showToast('관계가 클립보드에 복사되었습니다');
                } catch (err) {
                  showToast('클립보드 복사 실패');
                }
              }
            }}
          >모든 관계 내보내기</button>
        </div>
      </section>

      {/* 우측 카드 세부사항 */}
      <aside style={{ width: 300, borderLeft: '1px solid #ccc', overflowY: 'auto', padding: 20 }}>
        <h3>카드 세부사항</h3>
        {cardDetail ? (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div><strong>ID:</strong> {cardDetail.id}</div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <label style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
              제목
              <input className="editor-input" value={cardDetail.title} onChange={(e)=>updateCardField('title',e.target.value)} />
            </label>
              <button
                type="button"
                onClick={() => {
                  setModalCardId(currentCardId);
                  setModalNewTitle(cardDetail.title);
                  setShowTitleModal(true);
                }}
                className="editor-button"
                title="제목 수정"
              >
                ✏️
              </button>
            </div>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              내용
              <textarea className="editor-input" value={cardDetail.content||''} onChange={(e)=>updateCardField('content',e.target.value)} rows={4} />
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              카드타입 ({cardTypes.length}개 로드됨)
              <input
                list="cardTypeOptions"
                className="editor-input"
                value={cardTypeInput}
                onChange={(e)=>setCardTypeInput(e.target.value)}
                onBlur={saveCardType}
                placeholder="카드타입을 입력하세요"
                title={`사용 가능한 카드타입: ${cardTypes.map(ct => ct.cardtype_name).join(', ')}`}
              />
              <datalist id="cardTypeOptions">
                {cardTypes.map((ct) => (
                  <option key={ct.cardtype_id} value={ct.cardtype_name} />
                ))}
              </datalist>
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              완료
              <input type="checkbox" checked={Boolean(cardDetail.complete)} onChange={(e)=>updateCardField('complete',e.target.checked?1:0)} />
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              활성화
              <input type="checkbox" checked={Boolean(cardDetail.activate)} onChange={(e)=>updateCardField('activate',e.target.checked?1:0)} />
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              기간(일)
              <input className="editor-input" type="number" value={cardDetail.duration||''} onChange={(e)=>updateCardField('duration',e.target.value?Number(e.target.value):null)} />
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              ES
              <input className="editor-input" type="date" value={cardDetail.es?.slice(0,10)||''} onChange={(e)=>updateCardField('es',e.target.value)} />
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              LS
              <input className="editor-input" type="date" value={cardDetail.ls?.slice(0,10)||''} onChange={(e)=>updateCardField('ls',e.target.value)} />
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              시작일
              <input className="editor-input" type="date" value={cardDetail.startdate?.slice(0,10)||''} onChange={(e)=>updateCardField('startdate',e.target.value)} />
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              종료일
              <input className="editor-input" type="date" value={cardDetail.enddate?.slice(0,10)||''} onChange={(e)=>updateCardField('enddate',e.target.value)} />
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              가격
              <input
                className="editor-input"
                type="text"
                value={cardDetail.price!==null && cardDetail.price!==undefined ? cardDetail.price.toLocaleString('ko-KR') : ''}
                onChange={(e)=>{
                  const raw=e.target.value.replace(/[^0-9]/g,'');
                  updateCardField('price',raw?Number(raw):null);
                }}
              />
              <span>원</span>
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              프로젝트
              <select className="editor-select" value={cardDetail.project_id||''} onChange={(e)=>updateCardField('project_id',e.target.value||null)}>
                <option value="">(없음)</option>
                {projects.map(p=>(<option key={p.project_id} value={p.project_id}>{p.project_name}</option>))}
              </select>
            </label>

            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              <label style={{display:'flex',alignItems:'center',gap:8}}>
                별칭
                <input
                  list="aliasOptions"
                  className="editor-input"
                  value={aliasInput}
                  onChange={(e)=>setAliasInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCardAlias();
                    }
                  }}
                  placeholder="별칭 입력 후 Enter"
                />
                <datalist id="aliasOptions">
                  {aliases.map((alias) => (
                    <option key={alias.alias_id} value={alias.alias_name} />
                  ))}
                </datalist>
              </label>

              {cardAliases.length > 0 && (
                <div style={{marginLeft: 40}}>
                  <strong style={{fontSize: 12, color: '#666'}}>현재 별칭:</strong>
                  <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:4}}>
                    {cardAliases.map((alias) => (
                      <div
                        key={alias.alias_id}
                        style={{
                          display:'flex',
                          alignItems:'center',
                          gap:4,
                          padding:'2px 6px',
                          background:'#f0f0f0',
                          borderRadius:12,
                          fontSize:12,
                          border:'1px solid #ddd'
                        }}
                      >
                        <span>{alias.alias_name}</span>
                        <button
                          onClick={() => removeCardAlias(alias.alias_id)}
                          style={{
                            background:'none',
                            border:'none',
                            color:'#ff4444',
                            cursor:'pointer',
                            padding:0,
                            width:14,
                            height:14,
                            borderRadius:'50%',
                            display:'flex',
                            alignItems:'center',
                            justifyContent:'center',
                            fontSize:10
                          }}
                          title="별칭 제거"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div><strong>생성일:</strong> {cardDetail.createdat}</div>
          </div>
        ):<p>카드를 선택하세요.</p>}
      </aside>

      {/* 토스트 */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#333',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 6,
            zIndex: 9999,
          }}
        >
          {toast}
        </div>
      )}

      {showTitleModal && (
        <div className="modal-backdrop" onClick={()=>setShowTitleModal(false)}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <h3>카드 제목 수정</h3>
            <select value={modalCardId} onChange={(e)=>{setModalCardId(e.target.value); const t=cards.find(c=>c.id===e.target.value); if(t) setModalNewTitle(t.title);}}>
              {cards.map(c=>(<option key={c.id} value={c.id}>{c.title}</option>))}
            </select>
            <input value={modalNewTitle} onChange={(e)=>setModalNewTitle(e.target.value)} placeholder="새 제목" />
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowTitleModal(false)}>취소</button>
              <button onClick={async()=>{
                const newT=modalNewTitle.trim();
                if(!newT) return;
                await window.electron.ipcRenderer.invoke('update-card-title',{card_id:modalCardId,title:newT});
                setShowTitleModal(false);
                await loadCards();
                showToast('제목 변경 완료');
              }}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Opposite relation modal -------------------------------- */}
      {oppModal.show && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div style={{ background: '#222', padding: 24, borderRadius: 8, minWidth: 320 }}>
            <h4 style={{ marginTop: 0 }}>{oppModal.typeName} 의 반대 관계명 입력</h4>
            <input
              className="editor-input"
              type="text"
              value={oppositeInput}
              onChange={(e) => setOppositeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // 확인 버튼 클릭과 동일한 로직 실행
                  const btn = document.querySelector('.opposite-confirm-btn') as HTMLButtonElement;
                  if (btn) btn.click();
                }
              }}
              placeholder="반대 관계명"
              style={{ width: '100%' }}
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => {
                  setOppModal({ show: false, typeName: '' });
                  setOppositeInput('');
                }}
              >
                취소
              </button>
              <button
                className="opposite-confirm-btn"
                onClick={async () => {
                  const name = oppositeInput.trim();
                  if (!name) {
                    showToast('반대 관계명을 입력하세요');
                    return;
                  }
                  // 1) 관계타입 생성
                  const res = (await window.electron.ipcRenderer.invoke('create-relationtype', {
                    typename: oppModal.typeName,
                    oppsite: name,
                  })) as any;
                  if (!res.success) { showToast('관계타입 생성 실패'); return; }

                  // 2) 최신 관계타입 목록 갱신
                  const rtAll = (await window.electron.ipcRenderer.invoke('get-relationtypes')) as any;
                  if (rtAll.success) setRelationTypes(rtAll.data);

                  // 3) pendingRelation 정보로 이어서 카드/관계 생성
                  if(pendingRelation){
                    const newTypeId = res.data.id;
                    // target 카드 준비
                    let tgtId:string|undefined;
                    const tgtExist = cards.find(c=>c.title===pendingRelation.targetTitle);
                    if(tgtExist){ tgtId = tgtExist.id; }
                    else {
                      const crt = await window.electron.ipcRenderer.invoke('create-card',{title:pendingRelation.targetTitle}) as any;
                      if(crt.success){ tgtId = crt.data.id; await loadCards(); }
                    }

                    if(tgtId){
                      await window.electron.ipcRenderer.invoke('create-relation',{
                        relationtype_id:newTypeId,
                        source:pendingRelation.sourceId,
                        target:tgtId
                      });
                      await loadRelations(pendingRelation.sourceId);
                      await loadAllRelations(); // 모든 관계 목록도 새로고침
                    }
                  }

                  // 4) 모달/보류 상태 초기화 및 UI 정리
                  setPendingRelation(null);
                  setOppModal({ show: false, typeName: '' });
                  setOppositeInput('');
                  (document.getElementById('targetCardInput') as HTMLInputElement).value='';
                  showToast('관계 생성 완료');
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 관계 내보내기 모달 ---------------------------------- */}
      {showExportModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowExportModal(false)}
        >
          <div
            style={{
              background: '#222',
              padding: 24,
              borderRadius: 8,
              minWidth: '60%',
              maxWidth: '80%',
              maxHeight: '80%',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>관계 내보내기</h3>
            <textarea
              value={exportText}
              onChange={(e) => setExportText(e.target.value)}
              style={{
                width: '100%',
                minHeight: 300,
                background: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: 4,
                padding: 8,
                fontSize: 14,
                fontFamily: 'monospace',
                resize: 'vertical'
              }}
              placeholder="내보낼 텍스트를 수정하세요..."
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setShowExportModal(false)}
                style={{ padding: '8px 16px', background: '#666', color: '#fff', border: 'none', borderRadius: 4 }}
              >
                취소
              </button>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(exportText);
                    showToast('관계가 클립보드에 복사되었습니다');
                    setShowExportModal(false);
                  } catch (err) {
                    showToast('클립보드 복사 실패');
                  }
                }}
                style={{ padding: '8px 16px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 4 }}
              >
                클립보드에 복사
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 설정 모달 ---------------------------------- */}
      {showSettingsModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            style={{
              background: '#222',
              padding: 24,
              borderRadius: 8,
              minWidth: '60%',
              maxWidth: '80%',
              maxHeight: '80%',
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>설정</h3>

            {/* 카드 삭제 확인 설정 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h4 style={{ margin: 0, fontSize: 16 }}>카드 삭제</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.confirmDelete}
                  onChange={(e) => setSettings(prev => ({ ...prev, confirmDelete: e.target.checked }))}
                />
                <span>카드 삭제 시 확인창 표시</span>
              </label>
            </div>

            {/* 내보내기 텍스트 템플릿 설정 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h4 style={{ margin: 0, fontSize: 16 }}>내보내기 텍스트 템플릿</h4>
              <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
                사용 가능한 변수: {'{relationCount}'}, {'{relationList}'}, {'{timeCardsCount}'}, {'{timeLegend}'}, {'{timeLines}'}
              </p>
              <textarea
                value={settings.exportTemplate}
                onChange={(e) => setSettings(prev => ({ ...prev, exportTemplate: e.target.value }))}
                style={{
                  width: '100%',
                  minHeight: 200,
                  background: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: 4,
                  padding: 8,
                  fontSize: 14,
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }}
                placeholder="내보내기 텍스트 템플릿을 입력하세요..."
              />
            </div>

            {/* 버튼들 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => {
                  // 기본값으로 리셋
                  setSettings({
                    confirmDelete: true,
                    exportTemplate: `아래 관계들을 검토하여 이 관계의 논리적 오류가 있는지 점검하고, 이를 기반으로 계획을 세워줘.

전체 관계 목록 (총 {relationCount}건)
{relationList}

시간정보가 있는 카드 목록{timeCardsCount}
{timeLegend}
{timeLines}`
                  });
                  showToast('설정이 기본값으로 초기화되었습니다');
                }}
                style={{ padding: '8px 16px', background: '#666', color: '#fff', border: 'none', borderRadius: 4 }}
              >
                기본값 복원
              </button>
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{ padding: '8px 16px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 4 }}
              >
                완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Before/After 관계 충돌 모달 */}
      {conflictModal.show && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConflictModal({ show: false, field: '', value: null, conflicts: [] });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setConflictModal({ show: false, field: '', value: null, conflicts: [] });
            }
          }}
          tabIndex={0}
        >
          <div
            style={{
              background: '#1e1e1e',
              borderRadius: 8,
              border: '1px solid #555',
              padding: 24,
              maxWidth: 600,
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, color: '#fff' }}>Before/After 관계 충돌</h2>
              <button
                onClick={() => setConflictModal({ show: false, field: '', value: null, conflicts: [] })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  fontSize: 24,
                  cursor: 'pointer',
                  padding: 0,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ color: '#fff', fontSize: 16, lineHeight: 1.5 }}>
                <strong>{conflictModal.field}</strong> 필드를 <strong>{conflictModal.value}</strong>로 변경하려고 했지만,
                다음 before/after 관계 때문에 변경할 수 없습니다:
              </p>
            </div>

            <div style={{ marginBottom: 20 }}>
              {conflictModal.conflicts.map((conflict, index) => (
                <div
                  key={index}
                  style={{
                    background: '#2a2a2a',
                    padding: 16,
                    borderRadius: 6,
                    border: '1px solid #444',
                    marginBottom: 12
                  }}
                >
                  <div style={{ color: '#ff6b6b', fontWeight: 'bold', marginBottom: 8 }}>
                    {conflict.title}
                  </div>
                  <div style={{ color: '#ffd43b', fontSize: 14, marginBottom: 8 }}>
                    충돌 유형: {conflict.conflictType}
                  </div>
                  <div style={{ color: '#fff', fontSize: 14 }}>
                    {conflict.message}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setConflictModal({ show: false, field: '', value: null, conflicts: [] })}
                style={{
                  background: '#0066cc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '12px 24px',
                  cursor: 'pointer',
                  fontSize: 16
                }}
              >
                확인 (Esc)
              </button>
            </div>

            <div style={{ marginTop: 16, padding: 12, background: '#2a2a2a', borderRadius: 4, border: '1px solid #444' }}>
              <p style={{ color: '#888', fontSize: 12, margin: 0, lineHeight: 1.4 }}>
                💡 팁: before/after 관계에서는 앞선 카드의 날짜가 뒤따르는 카드의 날짜보다 늦을 수 없습니다.
                관계를 먼저 수정하거나 다른 카드의 날짜를 조정해주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 필터링 모달 */}
      {showFilterModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setShowFilterModal(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowFilterModal(false);
            }
          }}
          tabIndex={-1}
        >
          <div
            style={{
              background: '#1e1e1e',
              border: '1px solid #444',
              borderRadius: 8,
              padding: 24,
              width: '90%',
              maxWidth: 600,
              maxHeight: '80vh',
              overflow: 'auto',
              color: '#fff'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: 18 }}>필터링 및 정렬 옵션</h3>
              <button
                onClick={() => setShowFilterModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  fontSize: 24,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                ×
              </button>
            </div>


            {/* 1. 하위카드만 조회 */}
            <div style={{ marginBottom: 24, border: '1px solid #555', borderRadius: 8, padding: 16 }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#ccc', fontSize: 16 }}>하위카드만 조회</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={subcardsOnlyFilter.enabled}
                  onChange={(e) => setSubcardsOnlyFilter(prev => ({ ...prev, enabled: e.target.checked }))}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span>관계 체인 따라 필터링 활성화</span>
              </label>
              {subcardsOnlyFilter.enabled && (
                <div style={{ marginLeft: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* 관계 타입 선택 */}
                  <div>
                    <label style={{ display: 'block', color: '#ccc', marginBottom: 4, fontSize: 14 }}>
                      기준 관계 타입:
                    </label>
                    <select
                      value={subcardsOnlyFilter.relationTypeName}
                      onChange={(e) => setSubcardsOnlyFilter(prev => ({ ...prev, relationTypeName: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#333',
                        border: '1px solid #555',
                        borderRadius: 4,
                        color: '#fff'
                      }}
                    >
                      <option value="">관계 타입을 선택하세요</option>
                      {relationTypes.map((relType) => (
                        <option key={relType.relationtype_id} value={relType.typename}>
                          {relType.typename}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 목표 카드 선택 */}
                  <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', color: '#ccc', marginBottom: 4, fontSize: 14 }}>
                      목표 카드 이름:
                    </label>
                    <input
                      type="text"
                      value={subcardsOnlyFilter.targetCardTitle}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSubcardsOnlyFilter(prev => ({ ...prev, targetCardTitle: value }));
                        filterSubcardsTargetCards(value);
                      }}
                      onKeyDown={handleSubcardsKeyDown}
                      onFocus={() => {
                        if (subcardsOnlyFilter.targetCardTitle.trim()) {
                          filterSubcardsTargetCards(subcardsOnlyFilter.targetCardTitle);
                        }
                      }}
                      onBlur={() => {
                        // 약간의 지연을 두어 드롭다운 클릭 이벤트가 처리되도록 함
                        setTimeout(() => setSubcardsDropdownVisible(false), 200);
                      }}
                      placeholder="카드 제목을 입력하세요"
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#333',
                        border: `1px solid ${subcardsDropdownVisible ? '#4CAF50' : '#555'}`,
                        borderRadius: subcardsDropdownVisible ? '4px 4px 0 0' : 4,
                        color: '#fff',
                        outline: 'none'
                      }}
                    />

                    {/* 자동완성 드롭다운 */}
                    {subcardsDropdownVisible && filteredSubcardsTargets.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#333',
                        border: '1px solid #4CAF50',
                        borderTop: 'none',
                        borderRadius: '0 0 4px 4px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 3000
                      }}>
                        {filteredSubcardsTargets.map((card, index) => (
                          <div
                            key={card.id}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              backgroundColor: index === subcardsSelectedIndex ? '#4CAF50' : 'transparent',
                              color: index === subcardsSelectedIndex ? '#fff' : '#ccc',
                              borderBottom: index < filteredSubcardsTargets.length - 1 ? '1px solid #555' : 'none'
                            }}
                            onClick={() => {
                              setSubcardsOnlyFilter(prev => ({ ...prev, targetCardTitle: card.title }));
                              setSubcardsDropdownVisible(false);
                              setSubcardsSelectedIndex(-1);
                            }}
                          >
                            <div style={{ fontWeight: 'bold' }}>{card.title}</div>
                            {card.content && (
                              <div style={{ fontSize: '0.8em', color: '#888', marginTop: '2px' }}>
                                {card.content.length > 50
                                  ? `${card.content.substring(0, 50)}...`
                                  : card.content
                                }
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 설명 텍스트 */}
                  <div style={{
                    fontSize: 12,
                    color: '#888',
                    padding: '8px',
                    background: '#1a1a1a',
                    borderRadius: 4,
                    border: '1px solid #333'
                  }}>
                    <strong>사용 예시:</strong><br/>
                    관계 체인이 "A for B, B for C, C for D"이고<br/>
                    관계 타입 = "for", 목표 카드 = "D"로 설정하면<br/>
                    D로 이어지는 체인의 카드들(A, B, C)만 표시됩니다.
                  </div>
                </div>
              )}
            </div>

            {/* 2. 카드타입 필터 */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#ccc', fontSize: 16 }}>카드타입 필터</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 120, overflow: 'auto' }}>
                {cardTypes.map((cardType) => (
                  <label key={cardType.cardtype_id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={cardTypeFilters.includes(cardType.cardtype_name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCardTypeFilters(prev => [...prev, cardType.cardtype_name]);
                        } else {
                          setCardTypeFilters(prev => prev.filter(name => name !== cardType.cardtype_name));
                        }
                      }}
                      style={{ marginRight: 4 }}
                    />
                    <span>{cardType.cardtype_name}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={() => setCardTypeFilters([])}
                style={{
                  marginTop: 8,
                  padding: '4px 8px',
                  background: '#333',
                  border: '1px solid #555',
                  color: '#ccc',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 12
                }}
              >
                모두 해제
              </button>
            </div>

            {/* 3. 관계 필터 */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#ccc', fontSize: 16 }}>관계 필터</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={relationFilter.enabled}
                  onChange={(e) => setRelationFilter(prev => ({ ...prev, enabled: e.target.checked }))}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span>관계 필터링 활성화</span>
              </label>
              {relationFilter.enabled && (
                <div style={{ marginLeft: 24 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ccc', marginBottom: 4 }}>
                    <input
                      type="radio"
                      name="relationFilter"
                      checked={relationFilter.type === 'no-relations'}
                      onChange={() => setRelationFilter(prev => ({ ...prev, type: 'no-relations' }))}
                    />
                    <span>관계 없는 카드만 표시</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ccc' }}>
                    <input
                      type="radio"
                      name="relationFilter"
                      checked={relationFilter.type === 'has-relations'}
                      onChange={() => setRelationFilter(prev => ({ ...prev, type: 'has-relations' }))}
                    />
                    <span>관계 있는 카드만 표시</span>
                  </label>
                </div>
              )}
            </div>

            {/* 4. 날짜 필터 */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#ccc', fontSize: 16 }}>날짜 필터</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={dateFilter.enabled}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, enabled: e.target.checked }))}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span>날짜 필터링 활성화</span>
              </label>
              {dateFilter.enabled && (
                <div style={{ marginLeft: 24 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ccc', marginBottom: 4 }}>
                    <input
                      type="radio"
                      name="dateFilter"
                      checked={dateFilter.type === 'has-date'}
                      onChange={() => setDateFilter(prev => ({ ...prev, type: 'has-date' }))}
                    />
                    <span>날짜 지정된 카드만 표시</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ccc' }}>
                    <input
                      type="radio"
                      name="dateFilter"
                      checked={dateFilter.type === 'no-date'}
                      onChange={() => setDateFilter(prev => ({ ...prev, type: 'no-date' }))}
                    />
                    <span>날짜 미지정 카드만 표시</span>
                  </label>
                </div>
              )}
            </div>

            {/* 5. 금액 필터 */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#ccc', fontSize: 16 }}>금액 필터</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={amountFilter.enabled}
                    onChange={(e) => setAmountFilter(prev => ({ ...prev, enabled: e.target.checked }))}
                  />
                  <span>금액 필터링 활성화</span>
                </label>
                {amountFilter.enabled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 24 }}>
                    <input
                      type="number"
                      placeholder="금액 입력"
                      value={amountFilter.amount}
                      onChange={(e) => setAmountFilter(prev => ({ ...prev, amount: e.target.value }))}
                      style={{
                        padding: '6px 8px',
                        background: '#333',
                        border: '1px solid #555',
                        borderRadius: 4,
                        color: '#fff',
                        width: 120
                      }}
                    />
                    <select
                      value={amountFilter.operator}
                      onChange={(e) => setAmountFilter(prev => ({ ...prev, operator: e.target.value as 'gte' | 'lte' }))}
                      style={{
                        padding: '6px 8px',
                        background: '#333',
                        border: '1px solid #555',
                        borderRadius: 4,
                        color: '#fff'
                      }}
                    >
                      <option value="gte">이상</option>
                      <option value="lte">이하</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* 6. 정렬 옵션 */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#ccc', fontSize: 16 }}>정렬 옵션</h4>

              {/* 보유관계 갯수 정렬 */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={sortOptions.relationCount.enabled}
                    onChange={(e) => setSortOptions(prev => ({
                      ...prev,
                      relationCount: { ...prev.relationCount, enabled: e.target.checked }
                    }))}
                  />
                  <span>보유관계 갯수로 정렬</span>
                </label>
                {sortOptions.relationCount.enabled && (
                  <div style={{ marginLeft: 24 }}>
                    <div style={{ marginBottom: 12 }}>
                      <select
                        value={sortOptions.relationCount.order}
                        onChange={(e) => setSortOptions(prev => ({
                          ...prev,
                          relationCount: { ...prev.relationCount, order: e.target.value as 'desc' | 'asc' }
                        }))}
                        style={{
                          padding: '6px 8px',
                          background: '#333',
                          border: '1px solid #555',
                          color: '#fff',
                          borderRadius: 4,
                          fontSize: 13
                        }}
                      >
                        <option value="desc">많은 것부터 (내림차순)</option>
                        <option value="asc">적은 것부터 (오름차순)</option>
                      </select>
                    </div>
                    <div style={{ marginBottom: 8, fontSize: 14, color: '#aaa' }}>기준 관계타입 (복수선택 가능):</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 100, overflow: 'auto' }}>
                      {relationTypes.map((relType) => (
                        <label key={relType.relationtype_id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={sortOptions.relationCount.relationTypes.includes(relType.typename)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSortOptions(prev => ({
                                  ...prev,
                                  relationCount: {
                                    ...prev.relationCount,
                                    relationTypes: [...prev.relationCount.relationTypes, relType.typename]
                                  }
                                }));
                              } else {
                                setSortOptions(prev => ({
                                  ...prev,
                                  relationCount: {
                                    ...prev.relationCount,
                                    relationTypes: prev.relationCount.relationTypes.filter(name => name !== relType.typename)
                                  }
                                }));
                              }
                            }}
                          />
                          <span style={{ fontSize: 13 }}>{relType.typename}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 금액순 정렬 */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={sortOptions.amount.enabled}
                    onChange={(e) => setSortOptions(prev => ({
                      ...prev,
                      amount: { ...prev.amount, enabled: e.target.checked }
                    }))}
                  />
                  <span>금액순 정렬</span>
                </label>
                {sortOptions.amount.enabled && (
                  <div style={{ marginLeft: 24 }}>
                    <select
                      value={sortOptions.amount.order}
                      onChange={(e) => setSortOptions(prev => ({
                        ...prev,
                        amount: { ...prev.amount, order: e.target.value as 'desc' | 'asc' }
                      }))}
                      style={{
                        padding: '6px 8px',
                        background: '#333',
                        border: '1px solid #555',
                        borderRadius: 4,
                        color: '#fff'
                      }}
                    >
                      <option value="desc">내림차순 (높은 금액부터)</option>
                      <option value="asc">오름차순 (낮은 금액부터)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* 완료/미완료 정렬 */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={sortOptions.completion.enabled}
                    onChange={(e) => setSortOptions(prev => ({
                      ...prev,
                      completion: { ...prev.completion, enabled: e.target.checked }
                    }))}
                  />
                  <span>완료/미완료 정렬</span>
                </label>
                {sortOptions.completion.enabled && (
                  <div style={{ marginLeft: 24 }}>
                    <select
                      value={sortOptions.completion.order}
                      onChange={(e) => setSortOptions(prev => ({
                        ...prev,
                        completion: { ...prev.completion, order: e.target.value as 'incomplete-first' | 'complete-first' }
                      }))}
                      style={{
                        padding: '6px 8px',
                        background: '#333',
                        border: '1px solid #555',
                        borderRadius: 4,
                        color: '#fff'
                      }}
                    >
                      <option value="incomplete-first">미완료 먼저</option>
                      <option value="complete-first">완료 먼저</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* 적용/초기화 버튼 */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setCardSearchTerm('');
                  setCardTypeFilters([]);
                  setRelationFilter({ enabled: false, type: 'no-relations' });
                  setDateFilter({ enabled: false, type: 'has-date' });
                  setSubcardsOnlyFilter({ enabled: false, relationTypeName: '', targetCardTitle: '' });
                  setSubcardsDropdownVisible(false);
                  setSubcardsSelectedIndex(-1);
                  setAmountFilter({ enabled: false, amount: '', operator: 'gte' });
                  setSortOptions({
                    relationCount: { enabled: false, relationTypes: [], order: 'desc' },
                    amount: { enabled: false, order: 'desc' },
                    completion: { enabled: false, order: 'incomplete-first' }
                  });
                }}
                style={{
                  padding: '8px 16px',
                  background: '#444',
                  border: '1px solid #666',
                  color: '#ccc',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                초기화
              </button>
              <button
                onClick={() => setShowFilterModal(false)}
                style={{
                  padding: '8px 16px',
                  background: '#555',
                  border: '1px solid #777',
                  color: '#fff',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CardsManage({ cards, refreshCards }: { cards: { id: string; title: string }[]; refreshCards: () => void }) {
  return (
    <div style={{ padding: 20 }}>
      <h2>카드 관리</h2>
      <ul>
        {cards.map((c) => (
          <li key={c.id}>
            {c.title} <span style={{ color: '#888' }}>({c.id})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 카드타입 관리 페이지
function CardTypeManage() {
  const [cardTypes, setCardTypes] = useState<any[]>([]);
  const [editingId, setEditingId] = useState('');
  const [editingValue, setEditingValue] = useState('');
  const [newName, setNewName] = useState('');

  const load = async () => {
    const res = (await window.electron.ipcRenderer.invoke('get-cardtypes')) as any;
    if (res.success) setCardTypes(res.data);
  };
  useEffect(()=>{load();},[]);

  const saveEdit = async () => {
    if (!editingId || !editingValue) return;
    await window.electron.ipcRenderer.invoke('rename-cardtype', { cardtype_id: Number(editingId), name: editingValue });
    setEditingId('');
    setEditingValue('');
    load();
  };

  return (
    <div style={{padding:20}}>
      <h2>카드타입 관리</h2>
      <GenericTable data={cardTypes} />
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        <input placeholder="새 카드타입" value={newName} onChange={(e)=>setNewName(e.target.value)} />
        <button onClick={async()=>{
          const v=newName.trim(); if(!v) return;
          const res=await window.electron.ipcRenderer.invoke('create-cardtype',{name:v}) as any;
          if(res.success){setNewName(''); load();}
        }}>추가</button>
      </div>
      <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
        <colgroup>
          <col style={{width:'60px'}} />
          <col style={{width:'60%'}} />
          <col />
        </colgroup>
        <thead><tr><th>ID</th><th>이름</th><th></th></tr></thead>
        <tbody>
          {cardTypes.map(ct=> (
            <tr key={ct.cardtype_id}>
              <td>{ct.cardtype_id}</td>
              <td>
                {editingId===ct.cardtype_id ? (
                  <input value={editingValue} onChange={(e)=>setEditingValue(e.target.value)} />
                ): ct.cardtype_name}
              </td>
              <td>
                {editingId===ct.cardtype_id ? (
                  <>
                    <button onClick={saveEdit}>저장</button>
                    <button onClick={()=>{setEditingId(''); setEditingValue('');}}>취소</button>
                  </>
                ) : (
                  <>
                    <button onClick={()=>{setEditingId(ct.cardtype_id); setEditingValue(ct.cardtype_name);}}>편집</button>
                    <button onClick={async()=>{await window.electron.ipcRenderer.invoke('delete-cardtype',ct.cardtype_id); load();}}>삭제</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 관계타입 관리 페이지
function RelationTypeManage() {
  const [relationTypes,setRelationTypes]=useState<{relationtype_id:number; typename:string; oppsite:string; set_value?:number}[]>([]);
  const [newTypename,setNewTypename]=useState('');
  const [newOpp,setNewOpp]=useState('');
  const [editId,setEditId]=useState<number|null>(null);
  const [editName,setEditName]=useState('');
  const [editOpp,setEditOpp]=useState('');

  const load=async()=>{
    const res=await window.electron.ipcRenderer.invoke('get-relationtypes') as any;
    if(res.success) setRelationTypes(res.data);
  };
  useEffect(()=>{load();},[]);

  const add=async()=>{
    if(!newTypename.trim()||!newOpp.trim()) {alert('반대 관계명을 입력하세요'); return;}
    const res=await window.electron.ipcRenderer.invoke('create-relationtype',{typename:newTypename.trim(),oppsite:newOpp.trim()}) as any;
    if(res.success){setNewTypename('');setNewOpp('');load();}
  };

  const save=async()=>{
    if(editId===null) return;
    if(!editName.trim()) return;
    const row=relationTypes.find(r=>r.relationtype_id===editId);
    if(!row) return;
    await window.electron.ipcRenderer.invoke('rename-relationtype',{relationtype_id:editId,typename:editName.trim(),oppsite:row.oppsite});
    setEditId(null); setEditName(''); load();
  };

  // 그룹핑
  const pairs = relationTypes.reduce((acc:any[], rt)=>{
    if(acc.find((p)=>p.main===rt.typename||p.opp===rt.typename)) return acc;
    const oppRow = relationTypes.find(r=>r.typename===rt.oppsite);
    acc.push({id:rt.relationtype_id, main:rt.typename, opp:rt.oppsite, set:rt.set_value});
    return acc;
  },[]);

  return (
    <div style={{padding:20}}>
      <h2>관계타입 관리</h2>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        <input placeholder="관계타입" value={newTypename} onChange={(e)=>setNewTypename(e.target.value)} />
        <input placeholder="반대 관계" value={newOpp} onChange={(e)=>setNewOpp(e.target.value)} />
        <button onClick={add}>추가</button>
      </div>
      <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
        <colgroup><col style={{width:'60px'}} /><col /><col style={{width:'80px'}} /></colgroup>
        <thead><tr><th>ID</th><th>쌍</th><th></th></tr></thead>
        <tbody>
          {pairs.map((p,i)=>(
            <tr key={p.id} className={i%2===0?'pair-main':'pair-sub'}>
              <td>{p.id}</td>
              <td onDoubleClick={()=>{setEditId(p.id); setEditName(p.main);}}>
                {editId===p.id ? (
                  <input value={editName} onChange={(e)=>setEditName(e.target.value)} onBlur={save} autoFocus />
                ): `${p.main} ↔ ${p.opp}`}
              </td>
              <td><button onClick={async()=>{await window.electron.ipcRenderer.invoke('delete-relationtype',p.id); load();}}>삭제</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 할일 항목 컴포넌트
function TodoItem({
  card,
  cardTypes,
  onToggleComplete,
  onCardClick,
  onDelete
}: {
  card: any;
  cardTypes: any[];
  onToggleComplete: (cardId: string, currentComplete: boolean) => void;
  onCardClick?: (cardId: string) => void;
  onDelete?: (cardId: string, cardTitle: string) => void;
}) {
  const cardType = cardTypes.find(ct => ct.cardtype_id === card.cardtype);
  const isComplete = Boolean(card.complete);
  const isOverdue = card.enddate && new Date(card.enddate) < new Date() && !isComplete;

  // 우선순위 계산 (ES/LS 기반)
  const getPriority = () => {
    if (!card.es || !card.ls) return null;
    const esDate = new Date(card.es);
    const lsDate = new Date(card.ls);
    const buffer = (lsDate.getTime() - esDate.getTime()) / (1000 * 60 * 60 * 24); // 일 단위

    if (buffer <= 1) return '🔴 긴급';
    if (buffer <= 3) return '🟡 중요';
    return '🟢 여유';
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 16px',
        background: isComplete ? '#f8f8f8' : '#fff',
        border: `1px solid ${isOverdue ? '#ff6b6b' : '#e0e0e0'}`,
        borderRadius: 8,
        opacity: isComplete ? 0.7 : 1,
        boxShadow: isComplete ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
        cursor: onCardClick ? 'pointer' : 'default'
      }}
      onClick={() => onCardClick?.(card.id)}
    >
      {/* 체크박스 */}
      <input
        type="checkbox"
        checked={isComplete}
        onChange={() => onToggleComplete(card.id, isComplete)}
        onClick={(e) => e.stopPropagation()}
        style={{
          marginTop: 2,
          width: 16,
          height: 16,
          cursor: 'pointer'
        }}
      />

      {/* 할일 내용 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 제목 */}
        <div style={{
          fontSize: 16,
          fontWeight: 500,
          textDecoration: isComplete ? 'line-through' : 'none',
          color: isComplete ? '#888' : '#333',
          marginBottom: 4
        }}>
          {card.title}
        </div>

        {/* 설명 */}
        {card.content && (
          <div style={{
            fontSize: 14,
            color: '#666',
            marginBottom: 8,
            whiteSpace: 'pre-wrap'
          }}>
            {card.content}
          </div>
        )}

        {/* 메타 정보 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12 }}>
          {/* 카드타입 */}
          {cardType && (
            <span style={{
              background: '#e3f2fd',
              color: '#1976d2',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 11
            }}>
              {cardType.cardtype_name}
            </span>
          )}

          {/* 우선순위 */}
          {getPriority() && (
            <span style={{ color: '#666' }}>
              {getPriority()}
            </span>
          )}

          {/* 기간 */}
          {card.duration && (
            <span style={{ color: '#666' }}>
              📅 {card.duration}일
            </span>
          )}

          {/* 마감일 */}
          {card.enddate && (
            <span style={{
              color: isOverdue ? '#ff6b6b' : '#666',
              fontWeight: isOverdue ? 'bold' : 'normal'
            }}>
              ⏰ {card.enddate.slice(0, 10)}
              {isOverdue && ' (지연)'}
            </span>
          )}

          {/* 가격 */}
          {card.price && (
            <span style={{ color: '#666' }}>
              💰 {card.price.toLocaleString('ko-KR')}원
            </span>
          )}
        </div>
      </div>

      {/* 삭제 버튼 */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(card.id, card.title);
          }}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 24,
            height: 24,
            border: 'none',
            background: '#ff4757',
            color: 'white',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 'bold',
            opacity: 0.7,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
          title="카드 삭제"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// 고급 그래프 뷰 컴포넌트 (React Force Graph 기반)
function GraphView({
  cards,
  relations,
  relationTypes,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  onCreateRelation,
  onDeleteRelation,
  onRefresh
}: {
  cards: any[],
  relations: any[],
  relationTypes: any[],
  onCreateCard?: (title: string) => Promise<void>,
  onUpdateCard?: (id: string, field: string, value: any) => Promise<void>,
  onDeleteCard?: (id: string) => Promise<void>,
  onCreateRelation?: (sourceId: string, targetId: string, relationTypeId: number) => Promise<void>,
  onDeleteRelation?: (relationId: number) => Promise<void>,
  onRefresh?: () => Promise<void>
}) {
  const [selectedRelationType, setSelectedRelationType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 개선된 그래프 데이터 구조
  const [graphData, setGraphData] = useState<{
    nodes: Array<{
      id: string;
      name: string;
      importance: number;
      val: number; // 노드 크기
      color: string;
      group: number;
      fx: number; // X 좌표
      fy: number; // Y 좌표
    }>;
    links: Array<{
      source: string;
      target: string;
      value: number; // 링크 굵기
      color: string;
      label?: string;
    }>;
  }>({ nodes: [], links: [] });

  // CRUD 관련 상태
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedLink, setSelectedLink] = useState<any>(null);
  const [editingNode, setEditingNode] = useState<{ id: string; title: string } | null>(null);
  const [isCreatingRelation, setIsCreatingRelation] = useState(false);
  const [relationSource, setRelationSource] = useState<string>('');
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set());

  // 그래프 설정
  const graphWidth = 1000;
  const graphHeight = 600;

  // importance 계산 함수 (재귀적)
  const calculateImportance = (
    nodeId: string,
    relationTypeId: string,
    memo: Map<string, number> = new Map()
  ): number => {
    // 이미 계산된 경우 memoization 사용
    if (memo.has(nodeId)) {
      return memo.get(nodeId)!;
    }

    // 현재 노드의 depth-1 자식 노드들 찾기
    const childRelations = relations.filter(rel =>
      rel.source === nodeId && rel.relationtype_id === relationTypeId
    );

    const childNodes = childRelations.map(rel => rel.target);
    const childCount = childNodes.length;

    // 자식 노드들의 importance 합 계산
    let childrenImportanceSum = 0;
    for (const childId of childNodes) {
      childrenImportanceSum += calculateImportance(childId, relationTypeId, memo);
    }

    const importance = childCount + childrenImportanceSum;
    memo.set(nodeId, importance);

    return importance;
  };

  // 개선된 그래프 데이터 생성
  const generateGraphData = () => {
    if (!selectedRelationType) return;

    const relationType = relationTypes.find(rt => rt.typename === selectedRelationType);
    if (!relationType) return;

    // 모든 노드의 importance 계산
    const nodesWithImportance = cards.map(card => {
      const importance = calculateImportance(card.id, relationType.relationtype_id);

      return {
        id: card.id,
        name: card.title,
        importance,
        val: Math.max(5, importance * 3 + 5), // 노드 크기 (최소 5)
        color: getNodeColor(importance),
        group: Math.floor(importance / 2) + 1, // 그룹 분류
        fx: 0, // X 위치는 나중에 계산
        fy: 0  // Y 위치는 importance에 따라 결정
      };
    });

    // importance가 0인 노드들 제외 (관계가 없는 노드)
    const activeNodes = nodesWithImportance.filter(node =>
      node.importance > 0 ||
      relations.some(rel => rel.target === node.id && rel.relationtype_id === relationType.relationtype_id)
    );

    // Y축 위치 계산 (importance 값에 따라)
    const maxImportance = Math.max(...activeNodes.map(n => n.importance));
    const yScale = (graphHeight - 60) / Math.max(maxImportance, 1);

    // X축 위치 계산 (importance 별로 그룹화하여 분산)
    const importanceGroups = new Map<number, any[]>();
    activeNodes.forEach(node => {
      const imp = node.importance;
      if (!importanceGroups.has(imp)) {
        importanceGroups.set(imp, []);
      }
      importanceGroups.get(imp)!.push(node);
    });

    // 각 그룹 내에서 X 위치 분산
    const xScale = graphWidth - 80;
    activeNodes.forEach(node => {
      const group = importanceGroups.get(node.importance)!;
      const groupIndex = group.indexOf(node);
      const groupSize = group.length;

      // 그룹 내에서 균등 분배
      if (groupSize === 1) {
        node.fx = xScale / 2;
      } else {
        node.fx = (xScale * groupIndex) / (groupSize - 1);
      }

      // Y 위치는 importance에 따라 (아래로 갈수록 증가)
      node.fy = 20 + (node.importance * yScale);
    });

    // 링크 데이터 생성
    const links = relations
      .filter(rel => rel.relationtype_id === relationType.relationtype_id)
      .filter(rel =>
        activeNodes.some(n => n.id === rel.source) &&
        activeNodes.some(n => n.id === rel.target)
      )
      .map(rel => {
        const sourceNode = activeNodes.find(n => n.id === rel.source);
        const targetNode = activeNodes.find(n => n.id === rel.target);
        return {
        source: rel.source,
          target: rel.target,
          value: Math.max(1, (sourceNode?.importance || 1) + (targetNode?.importance || 1)) / 4,
          color: getLinkColor(rel.relationtype_id),
          label: relationType.typename,
        };
      });

    setGraphData({ nodes: activeNodes, links });
  };

  // 노드 색상 결정 함수
  const getNodeColor = (importance: number): string => {
    if (importance === 0) return '#cccccc';
    if (importance <= 2) return '#4fc3f7';
    if (importance <= 5) return '#29b6f6';
    if (importance <= 10) return '#0288d1';
    return '#01579b';
  };

  // 링크 색상 결정 함수
  const getLinkColor = (relationTypeId: number): string => {
    const colors = ['#ff9800', '#4caf50', '#f44336', '#9c27b0', '#2196f3'];
    return colors[relationTypeId % colors.length] || '#666666';
  };

  // relation type 변경시 그래프 데이터 재생성
  useEffect(() => {
    generateGraphData();
  }, [selectedRelationType, cards, relations, relationTypes]);

  // 초기 relation type 설정
  useEffect(() => {
    if (relationTypes.length > 0 && !selectedRelationType) {
      setSelectedRelationType(relationTypes[0].typename);
    }
  }, [relationTypes]);

  // 검색 및 하이라이트 기능
  const handleSearch = (searchValue: string) => {
    setSearchTerm(searchValue);

    if (!searchValue.trim()) {
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
      return;
    }

    const matchingNodes = graphData.nodes
      .filter(node =>
        node.name.toLowerCase().includes(searchValue.toLowerCase())
      );

    const nodeIds = new Set(matchingNodes.map(n => n.id));
    const linkedLinks = graphData.links
      .filter(link =>
        nodeIds.has(link.source) || nodeIds.has(link.target)
      );

    setHighlightNodes(nodeIds);
    setHighlightLinks(new Set(linkedLinks.map(l => `${l.source}-${l.target}`)));
  };

  // React Force Graph 이벤트 핸들러들
  const handleNodeClick = (node: any) => {
    setSelectedNode(node);

    // 연결된 노드들과 링크들 하이라이트
    const connectedNodes = new Set<string>();
    const connectedLinks = new Set<string>();

    connectedNodes.add(node.id);

    graphData.links.forEach(link => {
      if (link.source === node.id || link.target === node.id) {
        connectedNodes.add(typeof link.source === 'string' ? link.source : (link.source as any).id);
        connectedNodes.add(typeof link.target === 'string' ? link.target : (link.target as any).id);
        connectedLinks.add(`${link.source}-${link.target}`);
      }
    });

    setHighlightNodes(connectedNodes);
    setHighlightLinks(connectedLinks);
  };

  const handleNodeRightClick = (event: MouseEvent, node: any) => {
    event.preventDefault();
    setSelectedNode(node);

    // 컨텍스트 메뉴 표시를 위한 로직 (필요시 구현)
    if (window.confirm(`${node.name} 카드를 편집하시겠습니까?`)) {
      setEditingNode({ id: node.id, title: node.name });
    }
  };

  const handleNodeDoubleClick = (node: any) => {
    setEditingNode({ id: node.id, title: node.name });
  };


    return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 8 }}>
      {/* 고급 컨트롤 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        flexShrink: 0,
        gap: 16
      }}>
        {/* 왼쪽 컨트롤 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label htmlFor="relation-type-select" style={{ fontSize: 14, fontWeight: 600 }}>
            관계 타입:
          </label>
          <select
            id="relation-type-select"
            value={selectedRelationType}
            onChange={(e) => setSelectedRelationType(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #ddd',
              fontSize: 14,
              background: '#fff'
            }}
          >
            <option value="">선택하세요</option>
            {relationTypes.map(rt => (
              <option key={rt.relationtype_id} value={rt.typename}>
                {rt.typename}
              </option>
            ))}
          </select>
        </div>

        {/* 가운데 검색 */}
        <div style={{ flex: 1, maxWidth: 300 }}>
          <input
            type="text"
            placeholder="노드 검색..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #ddd',
              fontSize: 14
            }}
          />
      </div>

        {/* 오른쪽 컨트롤 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => {
              setHighlightNodes(new Set());
              setHighlightLinks(new Set());
              setSelectedNode(null);
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500
            }}
          >
            🔄 초기화
          </button>

          <div style={{
            padding: '4px 8px',
            fontSize: 11,
            color: '#666',
            background: '#f8f9fa',
            borderRadius: 4,
            border: '1px solid #e9ecef'
          }}>
            개선된 그래프뷰
          </div>
        </div>
      </div>

      {/* 메인 영역 */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: 12,
        overflow: 'hidden'
      }}>
        {/* 그래프 영역 */}
        <div style={{
          flex: selectedNode ? '1 1 70%' : '1 1 100%',
        border: '1px solid #ddd',
        borderRadius: 8,
        overflow: 'hidden',
          background: '#fafafa',
          position: 'relative',
          transition: 'flex 0.3s ease'
      }}>
        {!selectedRelationType ? (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            fontSize: 16,
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔗</div>
            <div>관계 타입을 선택해주세요</div>
            <div style={{ fontSize: 14, color: '#999' }}>
              선택 후 고급 그래프 시각화를 경험해보세요
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${graphWidth} ${graphHeight}`}
              style={{
                background: 'white',
                cursor: 'default'
              }}
              onClick={() => {
                setHighlightNodes(new Set());
                setHighlightLinks(new Set());
                setSelectedNode(null);
              }}
          >
            {/* 좌표축 그리기 */}
            {/* Y축 (왼쪽) */}
            <line
              x1={60}
              y1={20}
              x2={60}
              y2={graphHeight - 40}
              stroke="#333"
              strokeWidth="2"
            />

            {/* X축 (아래) */}
            <line
              x1={60}
              y1={graphHeight - 40}
              x2={graphWidth - 20}
              y2={graphHeight - 40}
              stroke="#333"
              strokeWidth="2"
            />

            {/* Y축 눈금 및 라벨 */}
            {graphData.nodes.length > 0 && (() => {
              const maxImportance = Math.max(...graphData.nodes.map(n => n.importance));
              const ticks = [];
              for (let i = 0; i <= maxImportance; i++) {
                const y = 20 + (i * (graphHeight - 60) / Math.max(maxImportance, 1));
                ticks.push(
                  <g key={i}>
                    <line
                      x1={55}
                      y1={y}
                      x2={60}
                      y2={y}
                      stroke="#333"
                      strokeWidth="1"
                    />
                    <text
                      x={50}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="12"
                      fill="#666"
                    >
                      {i}
                    </text>
                  </g>
                );
              }
              return ticks;
            })()}

            {/* 그리드 라인 */}
            {graphData.nodes.length > 0 && (() => {
              const maxImportance = Math.max(...graphData.nodes.map(n => n.importance));
              const gridLines = [];
              for (let i = 0; i <= maxImportance; i++) {
                const y = 20 + (i * (graphHeight - 60) / Math.max(maxImportance, 1));
                gridLines.push(
                  <line
                    key={i}
                    x1={60}
                    y1={y}
                    x2={graphWidth - 20}
                    y2={y}
                    stroke="#e0e0e0"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                );
              }
              return gridLines;
            })()}

            {/* 링크 그리기 */}
            {graphData.links.map((link, index) => {
              const sourceNode = graphData.nodes.find(n => n.id === link.source);
              const targetNode = graphData.nodes.find(n => n.id === link.target);

              if (!sourceNode || !targetNode) return null;

              const isHighlighted = highlightLinks.has(`${link.source}-${link.target}`);

              return (
                <line
                  key={index}
                  x1={60 + sourceNode.fx}
                  y1={sourceNode.fy}
                  x2={60 + targetNode.fx}
                  y2={targetNode.fy}
                  stroke={isHighlighted ? link.color : '#ccc'}
                  strokeWidth={isHighlighted ? Math.max(2, link.value) : 1}
                  opacity={isHighlighted ? 0.8 : 0.4}
                />
              );
            })}

            {/* 노드 그리기 */}
            {graphData.nodes.map(node => {
              const isHighlighted = highlightNodes.has(node.id);
              const isSelected = selectedNode?.id === node.id;

              return (
              <g key={node.id}>
                <circle
                    cx={60 + node.fx}
                    cy={node.fy}
                    r={node.val}
                    fill={isSelected ? "#ff6b6b" : (isHighlighted ? node.color : '#ddd')}
                  stroke="white"
                  strokeWidth="2"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNodeClick(node);
                    }}
                    onDoubleClick={() => handleNodeDoubleClick(node)}
                />
                <text
                    x={60 + node.fx}
                    y={node.fy - node.val - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#333"
                  fontWeight="500"
                    style={{ pointerEvents: 'none' }}
                >
                    {node.name.length > 12 ? node.name.substring(0, 12) + '...' : node.name}
                </text>
                <text
                    x={60 + node.fx}
                    y={node.fy + node.val + 15}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#666"
                    style={{ pointerEvents: 'none' }}
                >
                  {node.importance}
                </text>
              </g>
              );
            })}

            {/* 축 라벨 */}
            <text
              x={30}
              y={graphHeight / 2}
              textAnchor="middle"
              fontSize="14"
              fill="#333"
              transform={`rotate(-90, 30, ${graphHeight / 2})`}
            >
              Importance
            </text>

            <text
              x={graphWidth / 2}
              y={graphHeight - 10}
              textAnchor="middle"
              fontSize="14"
              fill="#333"
            >
              Nodes
            </text>
          </svg>

            {/* 왼쪽 상단 간단한 선택 표시 */}
            {selectedNode && (
              <div
                style={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  background: 'rgba(33, 37, 41, 0.9)',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  zIndex: 100,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                🎯 선택됨: {selectedNode.name}
              </div>
            )}

            {/* 편집 모달 */}
            {editingNode && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1001
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setEditingNode(null);
                  }
                }}
              >
                <div
                  style={{
                    background: '#fff',
                    padding: 24,
                    borderRadius: 12,
                    minWidth: 400,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                  }}
                >
                  <h3 style={{ marginTop: 0, marginBottom: 20, color: '#333' }}>카드 편집</h3>
                  <input
                    type="text"
                    value={editingNode.title}
                    onChange={(e) => setEditingNode({ ...editingNode, title: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e1e5e9',
                      borderRadius: 8,
                      fontSize: 16,
                      marginBottom: 20,
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editingNode && onUpdateCard) {
                          onUpdateCard(editingNode.id, 'title', editingNode.title).then(() => {
                            onRefresh?.();
                            setEditingNode(null);
                          });
                        }
                      } else if (e.key === 'Escape') {
                        setEditingNode(null);
                      }
                    }}
                  />
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setEditingNode(null)}
                      style={{
                        padding: '10px 20px',
                        border: '2px solid #e1e5e9',
                        borderRadius: 8,
                        background: '#fff',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500
                      }}
                    >
                      취소
                    </button>
                    <button
                      onClick={() => {
                        if (editingNode && onUpdateCard) {
                          onUpdateCard(editingNode.id, 'title', editingNode.title).then(() => {
                            onRefresh?.();
                            setEditingNode(null);
                          });
                        }
                      }}
                      style={{
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: 8,
                        background: '#007bff',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500
                      }}
                    >
                      저장
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

        {/* 오른쪽 상세 정보 패널 */}
        {selectedNode && (
        <div style={{
            width: 320,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            {/* 패널 헤더 */}
            <div style={{
              padding: 16,
              borderBottom: '1px solid #e9ecef',
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{
                fontWeight: 600,
                fontSize: 16,
                color: '#212529',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                📋 노드 상세정보
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 18,
                  cursor: 'pointer',
                  color: '#666',
                  padding: 4,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="패널 닫기"
              >
                ✕
              </button>
            </div>

            {/* 패널 내용 */}
            <div style={{
              flex: 1,
              padding: 16,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}>
              {/* 기본 정보 */}
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#495057' }}>
                  🏷️ 기본 정보
                </div>
                <div style={{
                  padding: 12,
          background: '#f8f9fa',
                  borderRadius: 6,
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>제목:</strong> {selectedNode.name}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>ID:</strong> <code style={{ fontSize: 12, background: '#e9ecef', padding: '2px 6px', borderRadius: 3 }}>{selectedNode.id}</code>
                  </div>
                  <div>
                    <strong>Importance:</strong>
                    <span style={{
                      background: selectedNode.color,
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      marginLeft: 8
                    }}>
                      {selectedNode.importance}
                    </span>
                  </div>
                </div>
              </div>

              {/* 연결 관계 */}
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#495057' }}>
                  🔗 나가는 관계
                </div>
                <div style={{
                  padding: 12,
                  background: '#f8f9fa',
                  borderRadius: 6,
                  border: '1px solid #e9ecef'
                }}>
                  {(() => {
                    const nodeRelations = relations.filter(rel =>
                      rel.source === selectedNode.id &&
                      rel.relationtype_id === relationTypes.find(rt => rt.typename === selectedRelationType)?.relationtype_id
                    );

                    if (nodeRelations.length === 0) {
                      return <div style={{ color: '#999', fontStyle: 'italic' }}>이 노드에서 나가는 관계가 없습니다</div>;
                    }

                    return nodeRelations.map((rel, index) => {
                      const otherNodeId = rel.target; // 항상 target (source 관계만 표시하므로)
                      const otherNode = cards.find(c => c.id === otherNodeId);
                      const direction = '→'; // 항상 나가는 관계

                      return (
                        <div key={index} style={{
                          padding: 8,
                          marginBottom: index < nodeRelations.length - 1 ? 8 : 0,
                          background: '#fff',
          borderRadius: 4,
                          border: '1px solid #dee2e6',
                          fontSize: 13
                        }}>
                          <div style={{ fontWeight: 500, marginBottom: 4 }}>
                            {direction} {selectedRelationType}
                          </div>
                          <div style={{ color: '#666' }}>
                            {otherNode?.title || otherNodeId}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* 노드 시각화 정보 */}
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#495057' }}>
                  🎨 시각화 정보
                </div>
                <div style={{
                  padding: 12,
                  background: '#f8f9fa',
                  borderRadius: 6,
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong>노드 크기:</strong>
                    <div style={{
                      width: selectedNode.val * 2,
                      height: selectedNode.val * 2,
                      borderRadius: '50%',
                      background: selectedNode.color,
                      border: '2px solid #fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                    }}></div>
                    {selectedNode.val}px
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>색상:</strong>
                    <span style={{
                      background: selectedNode.color,
                      padding: '2px 8px',
                      borderRadius: 3,
                      color: '#fff',
                      fontSize: 12,
                      marginLeft: 8
                    }}>
                      {selectedNode.color}
                    </span>
                  </div>
                  <div>
                    <strong>그룹:</strong> Group {selectedNode.group}
                  </div>
                </div>
              </div>

              {/* 빠른 액션 */}
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#495057' }}>
                  ⚡ 빠른 액션
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    onClick={() => setEditingNode({ id: selectedNode.id, title: selectedNode.name })}
                    style={{
                      padding: '10px 16px',
                      background: '#007bff',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      justifyContent: 'center'
                    }}
                  >
                    ✏️ 제목 편집
                  </button>
                  <button
                    onClick={async () => {
                      if (onDeleteCard && window.confirm(`"${selectedNode.name}" 노드를 삭제하시겠습니까?`)) {
                        await onDeleteCard(selectedNode.id);
                        setSelectedNode(null);
                        if (onRefresh) await onRefresh();
                      }
                    }}
                    style={{
                      padding: '10px 16px',
                      background: '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      justifyContent: 'center'
                    }}
                  >
                    🗑️ 노드 삭제
                  </button>
                  <button
                    onClick={() => {
                      setHighlightNodes(new Set([selectedNode.id]));
                      const nodeRelations = relations.filter(rel =>
                        rel.source === selectedNode.id &&
                        rel.relationtype_id === relationTypes.find(rt => rt.typename === selectedRelationType)?.relationtype_id
                      );
                      const linkSet = new Set<string>();
                      nodeRelations.forEach(rel => {
                        linkSet.add(`${rel.source}-${rel.target}`);
                      });
                      setHighlightLinks(linkSet);
                    }}
                    style={{
                      padding: '10px 16px',
                      background: '#28a745',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      justifyContent: 'center'
                    }}
                  >
                    🔍 나가는 관계 하이라이트
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 상태 및 정보 패널 */}
      {selectedRelationType && (
        <div style={{
          marginTop: 12,
          padding: 16,
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderRadius: 8,
          fontSize: 13,
          color: '#495057',
          flexShrink: 0,
          border: '1px solid #e9ecef'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#212529' }}>
                🔗 관계 타입: {selectedRelationType}
              </div>
              <div style={{ marginBottom: 4 }}>
                <strong>📊 Importance:</strong> (자식 노드 수) + (자식들의 importance 합계)
              </div>
              <div style={{ marginBottom: 4 }}>
                <strong>🎯 노드 수:</strong> {graphData.nodes.length}개 | <strong>🔗 링크 수:</strong> {graphData.links.length}개
              </div>
              {highlightNodes.size > 0 && (
                <div style={{ marginTop: 8, padding: 8, background: 'rgba(0, 123, 255, 0.1)', borderRadius: 4 }}>
                  <strong>🔍 선택됨:</strong> {highlightNodes.size}개 노드, {highlightLinks.size}개 링크
                </div>
              )}
            </div>

            <div style={{ flex: 1, fontSize: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#212529' }}>
                🎮 조작 가이드
              </div>
              <div style={{ lineHeight: 1.6 }}>
                <div>• <strong>클릭:</strong> 노드 선택 및 연결 하이라이트</div>
                <div>• <strong>더블클릭:</strong> 카드 제목 편집</div>
                <div>• <strong>검색:</strong> 노드명으로 실시간 필터링</div>
                <div>• <strong>초기화 버튼:</strong> 선택 및 하이라이트 해제</div>
                <div>• <strong>Importance:</strong> 노드 크기로 중요도 표시</div>
                <div>• <strong>색상:</strong> 중요도에 따른 자동 색상 변화</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 시각화 페이지
function Visualization() {
  const [activeTab, setActiveTab] = useState<'list' | 'graph' | 'calendar'>('list');
  const [cards, setCards] = useState<any[]>([]);
  const [cardTypes, setCardTypes] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [cardTypeInput, setCardTypeInput] = useState('');
  const [toast, setToast] = useState('');

  // Before/After 관계 충돌 모달 상태
  const [conflictModal, setConflictModal] = useState<{
    show: boolean;
    field: string;
    value: any;
    conflicts: any[];
  }>({ show: false, field: '', value: null, conflicts: [] });

  // 별칭 관련 상태
  const [aliases, setAliases] = useState<any[]>([]);
  const [cardAliases, setCardAliases] = useState<any[]>([]);
  const [aliasInput, setAliasInput] = useState('');
  // 관계 및 정렬 관련 상태
  const [allRelations, setAllRelations] = useState<any[]>([]);
  const [relationTypes, setRelationTypes] = useState<any[]>([]);
  const [sortByRelationType, setSortByRelationType] = useState('all');

  // 카드 검색 상태
  const [vizCardSearchTerm, setVizCardSearchTerm] = useState('');

  // 설정 상태
  const [settings, setSettings] = useState({
    confirmDelete: true,
    sleepStartTime: '23:00',
    sleepEndTime: '07:00',
    sleepDuration: '8시간',
    exportTemplate: `내보내기 일시: {currentDateTime}
수면 패턴: {sleepStartTime} ~ {sleepEndTime} ({sleepDuration})

아래 관계들을 검토하여 이 관계의 논리적 오류가 있는지 점검하고, 이를 기반으로 계획을 세워줘.

전체 관계 목록 (총 {relationCount}건)
{relationList}

시간정보가 있는 카드 목록{timeCardsCount}
{timeLegend}
{timeLines}`
  });

  // 카드 및 카드타입 로드
  useEffect(() => {
    const loadData = async () => {
      // 카드 로드
      const cardsRes = await window.electron.ipcRenderer.invoke('get-cards') as any;
      if (cardsRes.success) {
        // 각 카드의 상세 정보 로드
        const cardsWithDetails = await Promise.all(
          cardsRes.data.map(async (card: any) => {
            const detailRes = await window.electron.ipcRenderer.invoke('get-card-detail', card.id) as any;
            return detailRes.success ? detailRes.data : card;
          })
        );
        setCards(cardsWithDetails);
      }

      // 카드타입 로드
      const typesRes = await window.electron.ipcRenderer.invoke('get-cardtypes') as any;
      if (typesRes.success) {
        setCardTypes(typesRes.data);
      }

      // 프로젝트 로드
      const projectsRes = await window.electron.ipcRenderer.invoke('get-projects') as any;
      if (projectsRes.success) {
        setProjects(projectsRes.data);
      }

      // 별칭 로드
      const aliasesRes = await window.electron.ipcRenderer.invoke('get-aliases') as any;
      if (aliasesRes.success) {
        setAliases(aliasesRes.data);
      }

      // 관계 로드
      const relationsRes = await window.electron.ipcRenderer.invoke('get-relations') as any;
      if (relationsRes.success) {
        setAllRelations(relationsRes.data);
      }

      // 관계타입 로드
      const relationTypesRes = await window.electron.ipcRenderer.invoke('get-relationtypes') as any;
      if (relationTypesRes.success) {
        setRelationTypes(relationTypesRes.data);
      }
    };

    loadData();

    // 설정 로드
    try {
      const savedSettings = localStorage.getItem('for-need-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);

  // 설정 저장하기
  useEffect(() => {
    try {
      localStorage.setItem('for-need-settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('설정 저장 실패:', error);
    }
  }, [settings]);

  // Esc 키로 충돌 모달 닫기
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && conflictModal.show) {
        setConflictModal({ show: false, field: '', value: null, conflicts: [] });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [conflictModal.show]);

  // 토스트 메시지 표시
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // 카드별 관계 수 계산 (현재관계창과 동일: source인 관계만)
  const getRelationCount = (cardId: string) => {
    return allRelations.filter(rel => rel.source === cardId).length;
  };

  // 특정 관계타입별 관계 수 계산 (현재관계창과 동일: source인 관계만)
  const getRelationCountByType = (cardId: string, relationTypeName: string) => {
    const relationType = relationTypes.find(rt => rt.typename === relationTypeName);
    if (!relationType) return 0;

    return allRelations.filter(rel =>
      rel.source === cardId &&
      rel.relationtype_id === relationType.relationtype_id
    ).length;
  };

    // 카드 정렬 함수 (관계 수 + 가나다순)
  const getSortedCards = () => {
    // 모든 카드를 표시 (todo 필터링 제거)
    let filteredCards = [...cards];

    // 검색 필터 적용
    if (vizCardSearchTerm.trim()) {
      const searchTerm = vizCardSearchTerm.toLowerCase().trim();
      filteredCards = filteredCards.filter(card =>
        card.title.toLowerCase().includes(searchTerm) ||
        (card.content && card.content.toLowerCase().includes(searchTerm))
      );
    }

    return filteredCards.sort((a, b) => {
      let countA, countB;

      if (sortByRelationType === 'all') {
        countA = getRelationCount(a.id);
        countB = getRelationCount(b.id);
      } else {
        countA = getRelationCountByType(a.id, sortByRelationType);
        countB = getRelationCountByType(b.id, sortByRelationType);
      }

      // 관계 수가 같으면 가나다순 정렬
      if (countA === countB) {
        return a.title.localeCompare(b.title, 'ko-KR');
      }

      // 관계 수 내림차순 (많은 관계가 위로)
      return countB - countA;
    });
  };

  // 시각화에서 카드 삭제 함수
  const deleteCardFromList = async (cardId: string, cardTitle: string) => {
    // 설정에 따라 확인 다이얼로그 표시
    if (settings.confirmDelete && !window.confirm(`${cardTitle} 카드를 삭제할까요?`)) {
      return;
    }

    try {
      const res = (await window.electron.ipcRenderer.invoke('delete-card', cardId)) as any;
      if (res.success) {
        showToast(`${cardTitle} 카드 삭제 완료`);

        // 선택된 카드가 삭제된 카드라면 선택 해제
        if (selectedCard && selectedCard.id === cardId) {
          setSelectedCard(null);
        }

        // 카드 목록에서 제거
        setCards(prev => prev.filter(c => c.id !== cardId));

        // 관계 목록도 새로고침
        const relationsRes = await window.electron.ipcRenderer.invoke('get-relations') as any;
        if (relationsRes.success) {
          setAllRelations(relationsRes.data);
        }
      } else {
        showToast('카드 삭제에 실패했습니다');
      }
    } catch (error) {
      showToast('카드 삭제 중 오류가 발생했습니다');
      console.error('Delete card error:', error);
    }
  };

  // 그래프용 CRUD 함수들
  const createCardFromGraph = async (title: string) => {
    try {
      const res = await window.electron.ipcRenderer.invoke('create-card', { title }) as any;
      if (res.success) {
        showToast('새 카드가 생성되었습니다');
        await refreshData();
      } else {
        showToast('카드 생성에 실패했습니다');
      }
    } catch (error) {
      showToast('카드 생성 중 오류가 발생했습니다');
    }
  };

  const updateCardFromGraph = async (id: string, field: string, value: any) => {
    try {
      const res = await window.electron.ipcRenderer.invoke('update-card-field', {
        card_id: id,
        field,
        value
      }) as any;

      if (res.success) {
        showToast('카드가 업데이트되었습니다');
        await refreshData();
      } else {
        showToast('카드 업데이트에 실패했습니다');
      }
    } catch (error) {
      showToast('카드 업데이트 중 오류가 발생했습니다');
    }
  };

  const deleteCardFromGraph = async (id: string) => {
    try {
      const card = cards.find(c => c.id === id);
      const res = await window.electron.ipcRenderer.invoke('delete-card', id) as any;
      if (res.success) {
        showToast(`${card?.title || '카드'}가 삭제되었습니다`);
        await refreshData();
      } else {
        showToast('카드 삭제에 실패했습니다');
      }
    } catch (error) {
      showToast('카드 삭제 중 오류가 발생했습니다');
    }
  };

  const createRelationFromGraph = async (sourceId: string, targetId: string, relationTypeId: number) => {
    try {
      const res = await window.electron.ipcRenderer.invoke('create-relation', {
        relationtype_id: relationTypeId,
        source: sourceId,
        target: targetId
      }) as any;

      if (res.success) {
        showToast('관계가 생성되었습니다');
        await refreshData();
      } else {
        showToast('관계 생성에 실패했습니다');
      }
    } catch (error) {
      showToast('관계 생성 중 오류가 발생했습니다');
    }
  };

  const deleteRelationFromGraph = async (relationId: number) => {
    try {
      const res = await window.electron.ipcRenderer.invoke('delete-relation', relationId) as any;
      if (res.success) {
        showToast('관계가 삭제되었습니다');
        await refreshData();
      } else {
        showToast('관계 삭제에 실패했습니다');
      }
    } catch (error) {
      showToast('관계 삭제 중 오류가 발생했습니다');
    }
  };

  const refreshData = async () => {
    try {
      // 카드 데이터 새로고침
      const cardsRes = await window.electron.ipcRenderer.invoke('get-cards') as any;
      if (cardsRes.success) {
        const cardsWithDetails = await Promise.all(
          cardsRes.data.map(async (card: any) => {
            const detailRes = await window.electron.ipcRenderer.invoke('get-card-detail', card.id) as any;
            return detailRes.success ? detailRes.data : card;
          })
        );
        setCards(cardsWithDetails);
      }

      // 관계 데이터 새로고침
      const relationsRes = await window.electron.ipcRenderer.invoke('get-relations') as any;
      if (relationsRes.success) {
        setAllRelations(relationsRes.data);
      }
    } catch (error) {
      showToast('데이터 새로고침 중 오류가 발생했습니다');
    }
  };

    // 카드 선택 핸들러
  const handleCardSelect = async (cardId: string) => {
    const detailRes = await window.electron.ipcRenderer.invoke('get-card-detail', cardId) as any;
    if (detailRes.success) {
      setSelectedCard(detailRes.data);
      const cardType = cardTypes.find(ct => ct.cardtype_id === detailRes.data.cardtype);
      setCardTypeInput(cardType?.cardtype_name || '');

      // 카드 별칭들 불러오기
      const aliasRes = await window.electron.ipcRenderer.invoke('get-card-aliases', cardId) as any;
      if (aliasRes.success) {
        setCardAliases(aliasRes.data);
      }
      setAliasInput('');
    }
  };

  // 카드 필드 업데이트
  const updateCardField = async (field: string, value: any) => {
    if (!selectedCard) return;

    const res = await window.electron.ipcRenderer.invoke('update-card-field', {
      card_id: selectedCard.id,
      field,
      value
    }) as any;

    // Before/After 관계 충돌 검사
    if (!res.success && res.error === 'before_after_conflict') {
      // 충돌 모달 표시
      setConflictModal({
        show: true,
        field,
        value,
        conflicts: res.conflictCards || []
      });
      return;
    }

    if (res.success) {
      setSelectedCard((prev: any) => ({ ...prev, [field]: value }));

      // 리스트의 카드 정보도 업데이트
      setCards(prev => prev.map(card =>
        card.id === selectedCard.id ? { ...card, [field]: value } : card
      ));

      showToast(`${field} 업데이트 완료`);
    } else {
      showToast(`${field} 업데이트 실패`);
    }
  };

    // 카드타입 저장
  const saveCardType = async () => {
    if (!selectedCard || !cardTypeInput.trim()) return;

    try {
      // 카드타입 ID 찾기 또는 생성
      let cardTypeId = null;
      const existingType = cardTypes.find(ct => ct.cardtype_name === cardTypeInput);

      if (existingType) {
        cardTypeId = existingType.cardtype_id;
      } else {
        // 새 카드타입 생성
        const createRes = await window.electron.ipcRenderer.invoke('create-cardtype', { name: cardTypeInput }) as any;
        if (createRes.success) {
          cardTypeId = createRes.data.id || createRes.data.cardtype_id;
          // 카드타입 목록 새로고침
          const typesRes = await window.electron.ipcRenderer.invoke('get-cardtypes') as any;
          if (typesRes.success) {
            setCardTypes(typesRes.data);
          }
        }
      }

      if (cardTypeId) {
        await updateCardField('cardtype', cardTypeId);
      }
    } catch (error) {
      showToast('카드타입 저장 실패');
    }
  };

    // 별칭 추가
  const addCardAlias = async () => {
    if (!selectedCard || !aliasInput.trim()) return;

    const res = (await window.electron.ipcRenderer.invoke('add-card-alias', {
      card_id: selectedCard.id,
      alias_name: aliasInput.trim()
    })) as any;

    if (res.success) {
      // 카드 별칭들 새로고침
      const aliasRes = await window.electron.ipcRenderer.invoke('get-card-aliases', selectedCard.id) as any;
      if (aliasRes.success) {
        setCardAliases(aliasRes.data);
      }
      // 전체 별칭 목록 새로고침
      const aliasesRes = await window.electron.ipcRenderer.invoke('get-aliases') as any;
      if (aliasesRes.success) {
        setAliases(aliasesRes.data);
      }
      setAliasInput(''); // 입력 필드 초기화
      showToast('별칭이 추가되었습니다');
    } else if (res.error === 'duplicate') {
      showToast(res.message || '이미 있는 별칭입니다');
    } else {
      showToast('별칭 추가에 실패했습니다');
    }
  };

  // 별칭 제거
  const removeCardAlias = async (aliasId: number) => {
    if (!selectedCard) return;

    const res = (await window.electron.ipcRenderer.invoke('remove-card-alias', {
      card_id: selectedCard.id,
      alias_id: aliasId
    })) as any;

    if (res.success) {
      // 카드 별칭들 새로고침
      const aliasRes = await window.electron.ipcRenderer.invoke('get-card-aliases', selectedCard.id) as any;
      if (aliasRes.success) {
        setCardAliases(aliasRes.data);
      }
      showToast('별칭이 제거되었습니다');
    } else {
      showToast('별칭 제거에 실패했습니다');
    }
  };

  // 할일 완료 상태 토글
  const toggleComplete = async (cardId: string, currentComplete: boolean) => {
    const newComplete = currentComplete ? 0 : 1;
    await window.electron.ipcRenderer.invoke('update-card-field', {
      card_id: cardId,
      field: 'complete',
      value: newComplete
    });

    // 로컬 상태 업데이트
    setCards(prev => prev.map(card =>
      card.id === cardId ? { ...card, complete: newComplete } : card
    ));
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* 좌측 메인 콘텐츠 */}
      <div style={{ flex: 1, padding: 12, overflowY: 'auto' }}>

      {/* 탭 메뉴 */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 8,
        borderBottom: '1px solid #ccc'
      }}>
        {[
          { key: 'list', label: '리스트' },
          { key: 'graph', label: '그래프뷰' },
          { key: 'calendar', label: '캘린더' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '6px 16px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #0066cc' : '2px solid transparent',
              background: activeTab === tab.key ? '#f0f0f0' : 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? '#0066cc' : '#666'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {activeTab === 'list' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h3 style={{ margin: 0 }}>할일 목록</h3>
                <select
                  value={sortByRelationType}
                  onChange={(e) => setSortByRelationType(e.target.value)}
                  style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4 }}
                  title="관계타입별 정렬"
                >
                  <option value="all">전체관계</option>
                  {relationTypes.map((rt) => (
                    <option key={rt.relationtype_id} value={rt.typename}>
                      {rt.typename}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize: 14, color: '#666' }}>
                완료: {getSortedCards().filter(c => c.complete).length} / 전체: {getSortedCards().length}
              </div>
            </div>

            {/* 카드 검색 영역 */}
            <div style={{
              marginBottom: 16,
              padding: '12px',
              background: '#f8f9fa',
              borderRadius: 8,
              border: '1px solid #e9ecef'
            }}>
              <input
                type="text"
                placeholder="카드 검색..."
                value={vizCardSearchTerm}
                onChange={(e) => setVizCardSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
              {vizCardSearchTerm && (
                <div style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: '#666',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>검색 결과: {getSortedCards().length}개</span>
                  <button
                    onClick={() => setVizCardSearchTerm('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#666',
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                    title="검색 지우기"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

                        {getSortedCards().length === 0 ? (
              <p style={{ color: '#666', textAlign: 'center', padding: 40 }}>
                할일이 없습니다. 홈에서 카드를 생성해보세요.
              </p>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                flex: 1,
                overflowY: 'auto',
                paddingRight: 8,
                maxHeight: '100%'
              }}>
                {/* 미완료 할일들 */}
                <div>
                  <h4 style={{ margin: '0 0 12px 0', color: '#333', fontSize: 16 }}>
                    🔥 해야할 일 ({getSortedCards().filter(c => !c.complete).length})
                    <span style={{ fontSize: 12, fontWeight: 'normal', color: '#666', marginLeft: 8 }}>
                      {sortByRelationType === 'all' ? '전체관계순' : `${sortByRelationType}순`}
                    </span>
                  </h4>
                  {getSortedCards().filter(c => !c.complete).map(card => {
                    const relationCount = sortByRelationType === 'all'
                      ? getRelationCount(card.id)
                      : getRelationCountByType(card.id, sortByRelationType);

                    return (
                      <div key={card.id} style={{ position: 'relative' }}>
                        <TodoItem
                          card={card}
                          cardTypes={cardTypes}
                          onToggleComplete={toggleComplete}
                          onCardClick={handleCardSelect}
                          onDelete={deleteCardFromList}
                        />
                        <div style={{
                          position: 'absolute',
                          top: 8,
                          right: 36,
                          background: '#0066cc',
                          color: 'white',
                          borderRadius: 10,
                          padding: '2px 6px',
                          fontSize: 10,
                          fontWeight: 'bold'
                        }}>
                          {relationCount}
                        </div>
                      </div>
                    );
                  })}
                  {getSortedCards().filter(c => !c.complete).length === 0 && (
                    <p style={{ color: '#888', fontStyle: 'italic', marginLeft: 20 }}>
                      모든 할일을 완료했습니다! 🎉
                    </p>
                  )}
                </div>

                {/* 완료된 할일들 */}
                {getSortedCards().filter(c => c.complete).length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#666', fontSize: 16 }}>
                      ✅ 완료된 일 ({getSortedCards().filter(c => c.complete).length})
                    </h4>
                    {getSortedCards().filter(c => c.complete).map(card => {
                      const relationCount = sortByRelationType === 'all'
                        ? getRelationCount(card.id)
                        : getRelationCountByType(card.id, sortByRelationType);

                      return (
                        <div key={card.id} style={{ position: 'relative' }}>
                          <TodoItem
                            card={card}
                            cardTypes={cardTypes}
                            onToggleComplete={toggleComplete}
                            onCardClick={handleCardSelect}
                            onDelete={deleteCardFromList}
                          />
                          <div style={{
                            position: 'absolute',
                            top: 8,
                            right: 36,
                            background: '#666',
                            color: 'white',
                            borderRadius: 10,
                            padding: '2px 6px',
                            fontSize: 10,
                            fontWeight: 'bold'
                          }}>
                            {relationCount}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'graph' && (
          <GraphView
            cards={cards}
            relations={allRelations}
            relationTypes={relationTypes}
            onCreateCard={createCardFromGraph}
            onUpdateCard={updateCardFromGraph}
            onDeleteCard={deleteCardFromGraph}
            onCreateRelation={createRelationFromGraph}
            onDeleteRelation={deleteRelationFromGraph}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'calendar' && (
          <div style={{ height: '100%', overflowY: 'auto', paddingRight: 8 }}>
            <h3>캘린더 뷰</h3>
            <p style={{ color: '#666' }}>일정과 시간 정보를 캘린더로 표시하는 영역입니다.</p>
            {/* 캘린더 구현 예정 */}
          </div>
        )}
      </div>
      </div>

      {/* 우측 카드 세부사항 - 그래프뷰에서는 숨김 */}
      {activeTab !== 'graph' && (
      <aside style={{ width: 300, borderLeft: '1px solid #ccc', overflowY: 'auto', padding: 20 }}>
        <h3>카드 세부사항</h3>
        {selectedCard ? (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div><strong>ID:</strong> {selectedCard.id}</div>
            <label style={{display:'flex',alignItems:'center',gap:8}}>
              제목
              <input className="editor-input" value={selectedCard.title} onChange={(e)=>updateCardField('title',e.target.value)} />
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              내용
              <textarea className="editor-input" value={selectedCard.content||''} onChange={(e)=>updateCardField('content',e.target.value)} rows={4} />
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              카드타입 ({cardTypes.length}개 로드됨)
              <input
                list="cardTypeOptionsViz"
                className="editor-input"
                value={cardTypeInput}
                onChange={(e)=>setCardTypeInput(e.target.value)}
                onBlur={saveCardType}
                placeholder="카드타입을 입력하세요"
                title={`사용 가능한 카드타입: ${cardTypes.map(ct => ct.cardtype_name).join(', ')}`}
              />
              <datalist id="cardTypeOptionsViz">
                {cardTypes.map((ct) => (
                  <option key={ct.cardtype_id} value={ct.cardtype_name} />
                ))}
              </datalist>
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              완료
              <input type="checkbox" checked={Boolean(selectedCard.complete)} onChange={(e)=>updateCardField('complete',e.target.checked?1:0)} />
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              활성화
              <input type="checkbox" checked={Boolean(selectedCard.activate)} onChange={(e)=>updateCardField('activate',e.target.checked?1:0)} />
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              기간(일)
              <input className="editor-input" type="number" value={selectedCard.duration||''} onChange={(e)=>updateCardField('duration',e.target.value?Number(e.target.value):null)} />
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              ES
              <input className="editor-input" type="date" value={selectedCard.es?.slice(0,10)||''} onChange={(e)=>updateCardField('es',e.target.value)} />
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              LS
              <input className="editor-input" type="date" value={selectedCard.ls?.slice(0,10)||''} onChange={(e)=>updateCardField('ls',e.target.value)} />
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              시작일
              <input className="editor-input" type="date" value={selectedCard.startdate?.slice(0,10)||''} onChange={(e)=>updateCardField('startdate',e.target.value)} />
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              종료일
              <input className="editor-input" type="date" value={selectedCard.enddate?.slice(0,10)||''} onChange={(e)=>updateCardField('enddate',e.target.value)} />
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              가격
              <input
                className="editor-input"
                type="text"
                value={selectedCard.price!==null && selectedCard.price!==undefined ? selectedCard.price.toLocaleString('ko-KR') : ''}
                onChange={(e)=>{
                  const raw=e.target.value.replace(/[^0-9]/g,'');
                  updateCardField('price',raw?Number(raw):null);
                }}
              />
              <span>원</span>
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              프로젝트
              <select className="editor-select" value={selectedCard.project_id||''} onChange={(e)=>updateCardField('project_id',e.target.value||null)}>
                <option value="">(없음)</option>
                {projects.map(p=>(<option key={p.project_id} value={p.project_id}>{p.project_name}</option>))}
              </select>
            </label>

            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              <label style={{display:'flex',alignItems:'center',gap:8}}>
                별칭
                <input
                  list="aliasOptionsViz"
                  className="editor-input"
                  value={aliasInput}
                  onChange={(e)=>setAliasInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCardAlias();
                    }
                  }}
                  placeholder="별칭 입력 후 Enter"
                />
                <datalist id="aliasOptionsViz">
                  {aliases.map((alias) => (
                    <option key={alias.alias_id} value={alias.alias_name} />
                  ))}
                </datalist>
              </label>

              {cardAliases.length > 0 && (
                <div style={{marginLeft: 40}}>
                  <strong style={{fontSize: 12, color: '#666'}}>현재 별칭:</strong>
                  <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:4}}>
                    {cardAliases.map((alias) => (
                      <div
                        key={alias.alias_id}
                        style={{
                          display:'flex',
                          alignItems:'center',
                          gap:4,
                          padding:'2px 6px',
                          background:'#f0f0f0',
                          borderRadius:12,
                          fontSize:12,
                          border:'1px solid #ddd'
                        }}
                      >
                        <span>{alias.alias_name}</span>
                        <button
                          onClick={() => removeCardAlias(alias.alias_id)}
                          style={{
                            background:'none',
                            border:'none',
                            color:'#ff4444',
                            cursor:'pointer',
                            padding:0,
                            width:14,
                            height:14,
                            borderRadius:'50%',
                            display:'flex',
                            alignItems:'center',
                            justifyContent:'center',
                            fontSize:10
                          }}
                          title="별칭 제거"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div><strong>생성일:</strong> {selectedCard.createdat}</div>
          </div>
        ) : (
          <p style={{color:'#666',textAlign:'center'}}>카드를 선택하면 세부사항이 표시됩니다.</p>
        )}
      </aside>
      )}

      {/* 토스트 */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#333',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 6,
            zIndex: 9999,
          }}
        >
          {toast}
        </div>
      )}

      {/* Before/After 관계 충돌 모달 */}
      {conflictModal.show && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConflictModal({ show: false, field: '', value: null, conflicts: [] });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setConflictModal({ show: false, field: '', value: null, conflicts: [] });
            }
          }}
          tabIndex={0}
        >
          <div
            style={{
              background: '#1e1e1e',
              borderRadius: 8,
              border: '1px solid #555',
              padding: 24,
              maxWidth: 600,
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, color: '#fff' }}>Before/After 관계 충돌</h2>
              <button
                onClick={() => setConflictModal({ show: false, field: '', value: null, conflicts: [] })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  fontSize: 24,
                  cursor: 'pointer',
                  padding: 0,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ color: '#fff', fontSize: 16, lineHeight: 1.5 }}>
                <strong>{conflictModal.field}</strong> 필드를 <strong>{conflictModal.value}</strong>로 변경하려고 했지만,
                다음 before/after 관계 때문에 변경할 수 없습니다:
              </p>
            </div>

            <div style={{ marginBottom: 20 }}>
              {conflictModal.conflicts.map((conflict, index) => (
                <div
                  key={index}
                  style={{
                    background: '#2a2a2a',
                    padding: 16,
                    borderRadius: 6,
                    border: '1px solid #444',
                    marginBottom: 12
                  }}
                >
                  <div style={{ color: '#ff6b6b', fontWeight: 'bold', marginBottom: 8 }}>
                    {conflict.title}
                  </div>
                  <div style={{ color: '#ffd43b', fontSize: 14, marginBottom: 8 }}>
                    충돌 유형: {conflict.conflictType}
                  </div>
                  <div style={{ color: '#fff', fontSize: 14 }}>
                    {conflict.message}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setConflictModal({ show: false, field: '', value: null, conflicts: [] })}
                style={{
                  background: '#0066cc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '12px 24px',
                  cursor: 'pointer',
                  fontSize: 16
                }}
              >
                확인 (Esc)
              </button>
            </div>

            <div style={{ marginTop: 16, padding: 12, background: '#2a2a2a', borderRadius: 4, border: '1px solid #444' }}>
              <p style={{ color: '#888', fontSize: 12, margin: 0, lineHeight: 1.4 }}>
                💡 팁: before/after 관계에서는 앞선 카드의 날짜가 뒤따르는 카드의 날짜보다 늦을 수 없습니다.
                관계를 먼저 수정하거나 다른 카드의 날짜를 조정해주세요.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 관계 관리 페이지
// 설정 페이지
function Settings() {
  const [settings, setSettings] = useState({
    confirmDelete: true,
    sleepStartTime: '23:00',
    sleepEndTime: '07:00',
    sleepDuration: '8시간',
    exportTemplate: `내보내기 일시: {currentDateTime}
수면 패턴: {sleepStartTime} ~ {sleepEndTime} ({sleepDuration})

아래 관계들을 검토하여 이 관계의 논리적 오류가 있는지 점검하고, 이를 기반으로 계획을 세워줘.

전체 관계 목록 (총 {relationCount}건)
{relationList}

시간정보가 있는 카드 목록{timeCardsCount}
{timeLegend}
{timeLines}`
  });
  const [toast, setToast] = useState('');

  // 수면시간 자동 계산 함수
  const calculateSleepDuration = (startTime: string, endTime: string): string => {
    if (!startTime || !endTime) return '8시간';

    try {
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      let startMinutes = startHour * 60 + startMinute;
      let endMinutes = endHour * 60 + endMinute;

      // 다음날로 넘어가는 경우 (예: 23:00 ~ 07:00)
      if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60; // 24시간 추가
      }

      const durationMinutes = endMinutes - startMinutes;
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;

      if (minutes === 0) {
        return `${hours}시간`;
      } else {
        return `${hours}시간 ${minutes}분`;
      }
    } catch (error) {
      console.error('수면시간 계산 오류:', error);
      return '8시간';
    }
  };

  // 설정 불러오기
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('for-need-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.warn('설정 불러오기 실패:', error);
    }
  }, []);

  // 설정 저장하기
  useEffect(() => {
    try {
      localStorage.setItem('for-need-settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('설정 저장 실패:', error);
    }
  }, [settings]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const resetToDefaults = () => {
    setSettings({
      confirmDelete: true,
      sleepStartTime: '23:00',
      sleepEndTime: '07:00',
      sleepDuration: '8시간',
      exportTemplate: `내보내기 일시: {currentDateTime}
수면 패턴: {sleepStartTime} ~ {sleepEndTime} ({sleepDuration})

아래 관계들을 검토하여 이 관계의 논리적 오류가 있는지 점검하고, 이를 기반으로 계획을 세워줘.

전체 관계 목록 (총 {relationCount}건)
{relationList}

시간정보가 있는 카드 목록{timeCardsCount}
{timeLegend}
{timeLines}`
    });
    showToast('설정이 기본값으로 초기화되었습니다');
  };

  return (
    <div style={{
      height: '100vh',
      overflowY: 'auto',
      padding: 0
    }}>
      <div style={{ padding: 20, maxWidth: 800, margin: '0 auto', paddingBottom: 40 }}>
      {/* 토스트 메시지 */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          background: '#0066cc',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 1000,
          fontSize: 14
        }}>
          {toast}
        </div>
      )}

      <h2 style={{ marginTop: 0, marginBottom: 32, color: '#fff' }}>설정</h2>

      {/* 카드 삭제 확인 설정 */}
      <div style={{
        marginBottom: 32,
        padding: 20,
        background: '#1e1e1e',
        borderRadius: 8,
        border: '1px solid #333'
      }}>
        <h3 style={{ margin: 0, marginBottom: 16, fontSize: 18, color: '#fff' }}>카드 삭제</h3>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          color: '#fff'
        }}>
          <input
            type="checkbox"
            checked={settings.confirmDelete}
            onChange={(e) => setSettings(prev => ({ ...prev, confirmDelete: e.target.checked }))}
            style={{ transform: 'scale(1.2)' }}
          />
          <span>카드 삭제 시 확인창 표시</span>
        </label>
      </div>

      {/* 수면 패턴 설정 */}
      <div style={{
        marginBottom: 32,
        padding: 20,
        background: '#1e1e1e',
        borderRadius: 8,
        border: '1px solid #333'
      }}>
        <h3 style={{ margin: 0, marginBottom: 16, fontSize: 18, color: '#fff' }}>수면 패턴</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#ccc' }}>
              수면 시작
            </label>
            <input
              type="time"
              value={settings.sleepStartTime}
              onChange={(e) => {
                const newStartTime = e.target.value;
                setSettings(prev => {
                  const newSettings = { ...prev, sleepStartTime: newStartTime };
                  // 자동으로 수면시간 계산
                  newSettings.sleepDuration = calculateSleepDuration(newStartTime, prev.sleepEndTime);
                  return newSettings;
                });
              }}
              style={{
                width: '100%',
                padding: 12,
                background: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: 4,
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#ccc' }}>
              수면 종료
            </label>
            <input
              type="time"
              value={settings.sleepEndTime}
              onChange={(e) => {
                const newEndTime = e.target.value;
                setSettings(prev => {
                  const newSettings = { ...prev, sleepEndTime: newEndTime };
                  // 자동으로 수면시간 계산
                  newSettings.sleepDuration = calculateSleepDuration(prev.sleepStartTime, newEndTime);
                  return newSettings;
                });
              }}
              style={{
                width: '100%',
                padding: 12,
                background: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: 4,
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#ccc' }}>
              수면시간
            </label>
            <input
              type="text"
              value={settings.sleepDuration}
              onChange={(e) => setSettings(prev => ({ ...prev, sleepDuration: e.target.value }))}
              placeholder="예: 8시간, 7시간 30분"
              style={{
                width: '100%',
                padding: 12,
                background: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: 4,
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
          수면 시작/종료 시각을 변경하면 수면시간이 자동으로 계산됩니다. 수동으로도 수정할 수 있습니다.
        </p>
      </div>

      {/* 내보내기 텍스트 템플릿 설정 */}
      <div style={{
        marginBottom: 32,
        padding: 20,
        background: '#1e1e1e',
        borderRadius: 8,
        border: '1px solid #333'
      }}>
        <h3 style={{ margin: 0, marginBottom: 8, fontSize: 18, color: '#fff' }}>내보내기 텍스트 템플릿</h3>
        <p style={{ margin: 0, marginBottom: 16, fontSize: 14, color: '#888' }}>
          사용 가능한 변수: {'{currentDateTime}'}, {'{sleepStartTime}'}, {'{sleepEndTime}'}, {'{sleepDuration}'}, {'{relationCount}'}, {'{relationList}'}, {'{timeCardsCount}'}, {'{timeLegend}'}, {'{timeLines}'}
        </p>
        <textarea
          value={settings.exportTemplate}
          onChange={(e) => setSettings(prev => ({ ...prev, exportTemplate: e.target.value }))}
          style={{
            width: '100%',
            minHeight: 200,
            background: '#333',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: 4,
            padding: 12,
            fontSize: 14,
            fontFamily: 'monospace',
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
          placeholder="내보내기 텍스트 템플릿을 입력하세요..."
        />
      </div>

      {/* 액션 버튼들 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button
          onClick={resetToDefaults}
          style={{
            padding: '12px 24px',
            background: '#666',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          기본값 복원
        </button>
        <button
          onClick={() => showToast('설정이 저장되었습니다')}
          style={{
            padding: '12px 24px',
            background: '#0066cc',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          저장
        </button>
      </div>
      </div>
    </div>
  );
}

// 휴지통 페이지
function TrashManage() {
  const [activeTab, setActiveTab] = useState<'cards' | 'relations' | 'cardtypes' | 'relationtypes'>('cards');
  const [deletedCards, setDeletedCards] = useState<any[]>([]);
  const [deletedRelations, setDeletedRelations] = useState<any[]>([]);
  const [deletedCardTypes, setDeletedCardTypes] = useState<any[]>([]);
  const [deletedRelationTypes, setDeletedRelationTypes] = useState<any[]>([]);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // 삭제된 데이터 로드
  const loadDeletedData = async () => {
    try {
      // 현재는 백엔드에서 soft delete가 구현되지 않았으므로 빈 배열로 시작
      // 나중에 실제 API 호출로 변경 예정
      const deletedCardsRes = await window.electron.ipcRenderer.invoke('get-deleted-cards') as any;
      const deletedRelationsRes = await window.electron.ipcRenderer.invoke('get-deleted-relations') as any;
      const deletedCardTypesRes = await window.electron.ipcRenderer.invoke('get-deleted-cardtypes') as any;
      const deletedRelationTypesRes = await window.electron.ipcRenderer.invoke('get-deleted-relationtypes') as any;

      if (deletedCardsRes.success) setDeletedCards(deletedCardsRes.data);
      if (deletedRelationsRes.success) setDeletedRelations(deletedRelationsRes.data);
      if (deletedCardTypesRes.success) setDeletedCardTypes(deletedCardTypesRes.data);
      if (deletedRelationTypesRes.success) setDeletedRelationTypes(deletedRelationTypesRes.data);
    } catch (error) {
      console.warn('일부 삭제된 데이터 로드 실패 (아직 구현되지 않음):', error);
      // 현재는 빈 배열로 설정
      setDeletedCards([]);
      setDeletedRelations([]);
      setDeletedCardTypes([]);
      setDeletedRelationTypes([]);
    }
  };

  useEffect(() => {
    loadDeletedData();
  }, []);

  // 개별 복구 함수들
  const restoreCard = async (cardId: string) => {
    try {
      const res = await window.electron.ipcRenderer.invoke('restore-card', cardId) as any;
      if (res.success) {
        showToast('카드가 복구되었습니다');
        loadDeletedData();
      } else {
        showToast('카드 복구에 실패했습니다');
      }
    } catch (error) {
      showToast('카드 복구 중 오류가 발생했습니다');
    }
  };

  const restoreRelation = async (relationId: number) => {
    try {
      const res = await window.electron.ipcRenderer.invoke('restore-relation', relationId) as any;
      if (res.success) {
        showToast('관계가 복구되었습니다');
        loadDeletedData();
      } else {
        showToast('관계 복구에 실패했습니다');
      }
    } catch (error) {
      showToast('관계 복구 중 오류가 발생했습니다');
    }
  };

  const restoreCardType = async (cardTypeId: number) => {
    try {
      const res = await window.electron.ipcRenderer.invoke('restore-cardtype', cardTypeId) as any;
      if (res.success) {
        showToast('카드타입이 복구되었습니다');
        loadDeletedData();
      } else {
        showToast('카드타입 복구에 실패했습니다');
      }
    } catch (error) {
      showToast('카드타입 복구 중 오류가 발생했습니다');
    }
  };

  const restoreRelationType = async (relationTypeId: number) => {
    try {
      const res = await window.electron.ipcRenderer.invoke('restore-relationtype', relationTypeId) as any;
      if (res.success) {
        showToast('관계타입이 복구되었습니다');
        loadDeletedData();
      } else {
        showToast('관계타입 복구에 실패했습니다');
      }
    } catch (error) {
      showToast('관계타입 복구 중 오류가 발생했습니다');
    }
  };

  // 영구 삭제 함수들
  const permanentDeleteCard = async (cardId: string) => {
    if (!window.confirm('이 카드를 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    try {
      const res = await window.electron.ipcRenderer.invoke('permanent-delete-card', cardId) as any;
      if (res.success) {
        showToast('카드가 영구적으로 삭제되었습니다');
        loadDeletedData();
      } else {
        showToast('카드 영구 삭제에 실패했습니다');
      }
    } catch (error) {
      showToast('카드 영구 삭제 중 오류가 발생했습니다');
    }
  };

  const permanentDeleteRelation = async (relationId: number) => {
    if (!window.confirm('이 관계를 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    try {
      const res = await window.electron.ipcRenderer.invoke('permanent-delete-relation', relationId) as any;
      if (res.success) {
        showToast('관계가 영구적으로 삭제되었습니다');
        loadDeletedData();
      } else {
        showToast('관계 영구 삭제에 실패했습니다');
      }
    } catch (error) {
      showToast('관계 영구 삭제 중 오류가 발생했습니다');
    }
  };

  const permanentDeleteCardType = async (cardTypeId: number) => {
    if (!window.confirm('이 카드타입을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    try {
      const res = await window.electron.ipcRenderer.invoke('permanent-delete-cardtype', cardTypeId) as any;
      if (res.success) {
        showToast('카드타입이 영구적으로 삭제되었습니다');
        loadDeletedData();
      } else {
        showToast('카드타입 영구 삭제에 실패했습니다');
      }
    } catch (error) {
      showToast('카드타입 영구 삭제 중 오류가 발생했습니다');
    }
  };

  const permanentDeleteRelationType = async (relationTypeId: number) => {
    if (!window.confirm('이 관계타입을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    try {
      const res = await window.electron.ipcRenderer.invoke('permanent-delete-relationtype', relationTypeId) as any;
      if (res.success) {
        showToast('관계타입이 영구적으로 삭제되었습니다');
        loadDeletedData();
      } else {
        showToast('관계타입 영구 삭제에 실패했습니다');
      }
    } catch (error) {
      showToast('관계타입 영구 삭제 중 오류가 발생했습니다');
    }
  };

  // 전체 복구 함수들
  const restoreAllCards = async () => {
    if (!window.confirm('모든 삭제된 카드를 복구하시겠습니까?')) return;

    try {
      const res = await window.electron.ipcRenderer.invoke('restore-all-cards') as any;
      if (res.success) {
        showToast('모든 카드가 복구되었습니다');
        loadDeletedData();
      } else {
        showToast('전체 카드 복구에 실패했습니다');
      }
    } catch (error) {
      showToast('전체 카드 복구 중 오류가 발생했습니다');
    }
  };

  const restoreAllRelations = async () => {
    if (!window.confirm('모든 삭제된 관계를 복구하시겠습니까?')) return;

    try {
      const res = await window.electron.ipcRenderer.invoke('restore-all-relations') as any;
      if (res.success) {
        showToast('모든 관계가 복구되었습니다');
        loadDeletedData();
      } else {
        showToast('전체 관계 복구에 실패했습니다');
      }
    } catch (error) {
      showToast('전체 관계 복구 중 오류가 발생했습니다');
    }
  };

  const restoreAllCardTypes = async () => {
    if (!window.confirm('모든 삭제된 카드타입을 복구하시겠습니까?')) return;

    try {
      const res = await window.electron.ipcRenderer.invoke('restore-all-cardtypes') as any;
      if (res.success) {
        showToast('모든 카드타입이 복구되었습니다');
        loadDeletedData();
      } else {
        showToast('전체 카드타입 복구에 실패했습니다');
      }
    } catch (error) {
      showToast('전체 카드타입 복구 중 오류가 발생했습니다');
    }
  };

  const restoreAllRelationTypes = async () => {
    if (!window.confirm('모든 삭제된 관계타입을 복구하시겠습니까?')) return;

    try {
      const res = await window.electron.ipcRenderer.invoke('restore-all-relationtypes') as any;
      if (res.success) {
        showToast('모든 관계타입이 복구되었습니다');
        loadDeletedData();
      } else {
        showToast('전체 관계타입 복구에 실패했습니다');
      }
    } catch (error) {
      showToast('전체 관계타입 복구 중 오류가 발생했습니다');
    }
  };

  // 전체 영구 삭제 함수들
  const clearAllCards = async () => {
    if (!window.confirm('모든 삭제된 카드를 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    try {
      const res = await window.electron.ipcRenderer.invoke('clear-all-cards') as any;
      if (res.success) {
        showToast('모든 카드가 영구적으로 삭제되었습니다');
        loadDeletedData();
      } else {
        showToast('전체 카드 영구 삭제에 실패했습니다');
      }
    } catch (error) {
      showToast('전체 카드 영구 삭제 중 오류가 발생했습니다');
    }
  };

  const clearAllRelations = async () => {
    if (!window.confirm('모든 삭제된 관계를 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    try {
      const res = await window.electron.ipcRenderer.invoke('clear-all-relations') as any;
      if (res.success) {
        showToast('모든 관계가 영구적으로 삭제되었습니다');
        loadDeletedData();
      } else {
        showToast('전체 관계 영구 삭제에 실패했습니다');
      }
    } catch (error) {
      showToast('전체 관계 영구 삭제 중 오류가 발생했습니다');
    }
  };

  const clearAllCardTypes = async () => {
    if (!window.confirm('모든 삭제된 카드타입을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    try {
      const res = await window.electron.ipcRenderer.invoke('clear-all-cardtypes') as any;
      if (res.success) {
        showToast('모든 카드타입이 영구적으로 삭제되었습니다');
        loadDeletedData();
      } else {
        showToast('전체 카드타입 영구 삭제에 실패했습니다');
      }
    } catch (error) {
      showToast('전체 카드타입 영구 삭제 중 오류가 발생했습니다');
    }
  };

  const clearAllRelationTypes = async () => {
    if (!window.confirm('모든 삭제된 관계타입을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    try {
      const res = await window.electron.ipcRenderer.invoke('clear-all-relationtypes') as any;
      if (res.success) {
        showToast('모든 관계타입이 영구적으로 삭제되었습니다');
        loadDeletedData();
      } else {
        showToast('전체 관계타입 영구 삭제에 실패했습니다');
      }
    } catch (error) {
      showToast('전체 관계타입 영구 삭제 중 오류가 발생했습니다');
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      {/* 토스트 메시지 */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          background: '#0066cc',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 1000,
          fontSize: 14
        }}>
          {toast}
        </div>
      )}

      <h2 style={{ marginTop: 0, marginBottom: 32, color: '#fff' }}>휴지통</h2>

      {/* 탭 메뉴 */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 24,
        borderBottom: '1px solid #333'
      }}>
        {[
          { key: 'cards', label: `카드 (${deletedCards.length})` },
          { key: 'relations', label: `관계 (${deletedRelations.length})` },
          { key: 'cardtypes', label: `카드타입 (${deletedCardTypes.length})` },
          { key: 'relationtypes', label: `관계타입 (${deletedRelationTypes.length})` }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #0066cc' : '2px solid transparent',
              background: activeTab === tab.key ? '#1e1e1e' : 'transparent',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? '#0066cc' : '#666'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 삭제된 카드 탭 */}
      {activeTab === 'cards' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: '#fff' }}>삭제된 카드</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={restoreAllCards}
                disabled={deletedCards.length === 0}
                style={{
                  padding: '8px 16px',
                  background: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: deletedCards.length > 0 ? 'pointer' : 'not-allowed',
                  opacity: deletedCards.length > 0 ? 1 : 0.5
                }}
              >
                전체 복구
              </button>
              <button
                onClick={clearAllCards}
                disabled={deletedCards.length === 0}
                style={{
                  padding: '8px 16px',
                  background: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: deletedCards.length > 0 ? 'pointer' : 'not-allowed',
                  opacity: deletedCards.length > 0 ? 1 : 0.5
                }}
              >
                전체 영구 삭제
              </button>
            </div>
          </div>

          {deletedCards.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: 40 }}>
              삭제된 카드가 없습니다.
            </p>
          ) : (
            <div style={{
              background: '#1e1e1e',
              borderRadius: 8,
              border: '1px solid #333',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#2a2a2a' }}>
                    <th style={{ padding: 12, textAlign: 'left', color: '#fff', borderBottom: '1px solid #333' }}>제목</th>
                    <th style={{ padding: 12, textAlign: 'left', color: '#fff', borderBottom: '1px solid #333' }}>카드타입</th>
                    <th style={{ padding: 12, textAlign: 'left', color: '#fff', borderBottom: '1px solid #333' }}>삭제일</th>
                    <th style={{ padding: 12, textAlign: 'center', color: '#fff', borderBottom: '1px solid #333' }}>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedCards.map((card) => (
                    <tr key={card.id} style={{ borderBottom: '1px solid #333' }}>
                      <td style={{ padding: 12, color: '#fff' }}>{card.title}</td>
                      <td style={{ padding: 12, color: '#888' }}>{card.cardtype_name || '없음'}</td>
                      <td style={{ padding: 12, color: '#888' }}>
                        {card.deleted_at ? new Date(card.deleted_at).toLocaleString() : '알 수 없음'}
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <button
                          onClick={() => restoreCard(card.id)}
                          style={{
                            padding: '4px 12px',
                            background: '#28a745',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            marginRight: 8,
                            fontSize: 12
                          }}
                        >
                          복구
                        </button>
                        <button
                          onClick={() => permanentDeleteCard(card.id)}
                          style={{
                            padding: '4px 12px',
                            background: '#dc3545',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          영구 삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 삭제된 관계 탭 */}
      {activeTab === 'relations' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: '#fff' }}>삭제된 관계</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={restoreAllRelations}
                disabled={deletedRelations.length === 0}
                style={{
                  padding: '8px 16px',
                  background: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: deletedRelations.length > 0 ? 'pointer' : 'not-allowed',
                  opacity: deletedRelations.length > 0 ? 1 : 0.5
                }}
              >
                전체 복구
              </button>
              <button
                onClick={clearAllRelations}
                disabled={deletedRelations.length === 0}
                style={{
                  padding: '8px 16px',
                  background: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: deletedRelations.length > 0 ? 'pointer' : 'not-allowed',
                  opacity: deletedRelations.length > 0 ? 1 : 0.5
                }}
              >
                전체 영구 삭제
              </button>
            </div>
          </div>

          {deletedRelations.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: 40 }}>
              삭제된 관계가 없습니다.
            </p>
          ) : (
            <div style={{
              background: '#1e1e1e',
              borderRadius: 8,
              border: '1px solid #333',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#2a2a2a' }}>
                    <th style={{ padding: 12, textAlign: 'left', color: '#fff', borderBottom: '1px solid #333' }}>소스</th>
                    <th style={{ padding: 12, textAlign: 'left', color: '#fff', borderBottom: '1px solid #333' }}>관계타입</th>
                    <th style={{ padding: 12, textAlign: 'left', color: '#fff', borderBottom: '1px solid #333' }}>대상</th>
                    <th style={{ padding: 12, textAlign: 'left', color: '#fff', borderBottom: '1px solid #333' }}>삭제일</th>
                    <th style={{ padding: 12, textAlign: 'center', color: '#fff', borderBottom: '1px solid #333' }}>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedRelations.map((relation) => (
                    <tr key={relation.relation_id} style={{ borderBottom: '1px solid #333' }}>
                      <td style={{ padding: 12, color: '#fff' }}>{relation.source_title || relation.source}</td>
                      <td style={{ padding: 12, color: '#888' }}>{relation.typename}</td>
                      <td style={{ padding: 12, color: '#fff' }}>{relation.target_title || relation.target}</td>
                      <td style={{ padding: 12, color: '#888' }}>
                        {relation.deleted_at ? new Date(relation.deleted_at).toLocaleString() : '알 수 없음'}
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <button
                          onClick={() => restoreRelation(relation.relation_id)}
                          style={{
                            padding: '4px 12px',
                            background: '#28a745',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            marginRight: 8,
                            fontSize: 12
                          }}
                        >
                          복구
                        </button>
                        <button
                          onClick={() => permanentDeleteRelation(relation.relation_id)}
                          style={{
                            padding: '4px 12px',
                            background: '#dc3545',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          영구 삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 삭제된 카드타입 탭 */}
      {activeTab === 'cardtypes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: '#fff' }}>삭제된 카드타입</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={restoreAllCardTypes}
                disabled={deletedCardTypes.length === 0}
                style={{
                  padding: '8px 16px',
                  background: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: deletedCardTypes.length > 0 ? 'pointer' : 'not-allowed',
                  opacity: deletedCardTypes.length > 0 ? 1 : 0.5
                }}
              >
                전체 복구
              </button>
              <button
                onClick={clearAllCardTypes}
                disabled={deletedCardTypes.length === 0}
                style={{
                  padding: '8px 16px',
                  background: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: deletedCardTypes.length > 0 ? 'pointer' : 'not-allowed',
                  opacity: deletedCardTypes.length > 0 ? 1 : 0.5
                }}
              >
                전체 영구 삭제
              </button>
            </div>
          </div>

          {deletedCardTypes.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: 40 }}>
              삭제된 카드타입이 없습니다.
            </p>
          ) : (
            <div style={{
              background: '#1e1e1e',
              borderRadius: 8,
              border: '1px solid #333',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#2a2a2a' }}>
                    <th style={{ padding: 12, textAlign: 'left', color: '#fff', borderBottom: '1px solid #333' }}>이름</th>
                    <th style={{ padding: 12, textAlign: 'left', color: '#fff', borderBottom: '1px solid #333' }}>삭제일</th>
                    <th style={{ padding: 12, textAlign: 'center', color: '#fff', borderBottom: '1px solid #333' }}>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedCardTypes.map((cardType) => (
                    <tr key={cardType.cardtype_id} style={{ borderBottom: '1px solid #333' }}>
                      <td style={{ padding: 12, color: '#fff' }}>{cardType.cardtype_name}</td>
                      <td style={{ padding: 12, color: '#888' }}>
                        {cardType.deleted_at ? new Date(cardType.deleted_at).toLocaleString() : '알 수 없음'}
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <button
                          onClick={() => restoreCardType(cardType.cardtype_id)}
                          style={{
                            padding: '4px 12px',
                            background: '#28a745',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            marginRight: 8,
                            fontSize: 12
                          }}
                        >
                          복구
                        </button>
                        <button
                          onClick={() => permanentDeleteCardType(cardType.cardtype_id)}
                          style={{
                            padding: '4px 12px',
                            background: '#dc3545',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          영구 삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 삭제된 관계타입 탭 */}
      {activeTab === 'relationtypes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: '#fff' }}>삭제된 관계타입</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={restoreAllRelationTypes}
                disabled={deletedRelationTypes.length === 0}
                style={{
                  padding: '8px 16px',
                  background: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: deletedRelationTypes.length > 0 ? 'pointer' : 'not-allowed',
                  opacity: deletedRelationTypes.length > 0 ? 1 : 0.5
                }}
              >
                전체 복구
              </button>
              <button
                onClick={clearAllRelationTypes}
                disabled={deletedRelationTypes.length === 0}
                style={{
                  padding: '8px 16px',
                  background: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: deletedRelationTypes.length > 0 ? 'pointer' : 'not-allowed',
                  opacity: deletedRelationTypes.length > 0 ? 1 : 0.5
                }}
              >
                전체 영구 삭제
              </button>
            </div>
          </div>

          {deletedRelationTypes.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: 40 }}>
              삭제된 관계타입이 없습니다.
            </p>
          ) : (
            <div style={{
              background: '#1e1e1e',
              borderRadius: 8,
              border: '1px solid #333',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#2a2a2a' }}>
                    <th style={{ padding: 12, textAlign: 'left', color: '#fff', borderBottom: '1px solid #333' }}>이름</th>
                    <th style={{ padding: 12, textAlign: 'left', color: '#fff', borderBottom: '1px solid #333' }}>반대 관계</th>
                    <th style={{ padding: 12, textAlign: 'left', color: '#fff', borderBottom: '1px solid #333' }}>삭제일</th>
                    <th style={{ padding: 12, textAlign: 'center', color: '#fff', borderBottom: '1px solid #333' }}>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedRelationTypes.map((relationType) => (
                    <tr key={relationType.relationtype_id} style={{ borderBottom: '1px solid #333' }}>
                      <td style={{ padding: 12, color: '#fff' }}>{relationType.typename}</td>
                      <td style={{ padding: 12, color: '#888' }}>{relationType.oppsite}</td>
                      <td style={{ padding: 12, color: '#888' }}>
                        {relationType.deleted_at ? new Date(relationType.deleted_at).toLocaleString() : '알 수 없음'}
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <button
                          onClick={() => restoreRelationType(relationType.relationtype_id)}
                          style={{
                            padding: '4px 12px',
                            background: '#28a745',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            marginRight: 8,
                            fontSize: 12
                          }}
                        >
                          복구
                        </button>
                        <button
                          onClick={() => permanentDeleteRelationType(relationType.relationtype_id)}
                          style={{
                            padding: '4px 12px',
                            background: '#dc3545',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          영구 삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 분석 페이지
function Analytics() {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'errors' | 'sessions'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [actionFrequency, setActionFrequency] = useState<any[]>([]);
  const [dailyActivity, setDailyActivity] = useState<any[]>([]);
  const [hourlyActivity, setHourlyActivity] = useState<any[]>([]);
  const [errorAnalysis, setErrorAnalysis] = useState<any[]>([]);
  const [sessionAnalysis, setSessionAnalysis] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadAnalyticsData = async () => {
    try {
      // 기본 통계
      const statsRes = await window.electron.ipcRenderer.invoke('get-usage-stats') as any;
      if (statsRes.success) setStats(statsRes.data);

      // 기능별 사용 빈도
      const frequencyRes = await window.electron.ipcRenderer.invoke('get-action-frequency') as any;
      if (frequencyRes.success) setActionFrequency(frequencyRes.data);

      // 일별 활동
      const dailyRes = await window.electron.ipcRenderer.invoke('get-daily-activity') as any;
      if (dailyRes.success) setDailyActivity(dailyRes.data);

      // 시간대별 활동
      const hourlyRes = await window.electron.ipcRenderer.invoke('get-hourly-activity') as any;
      if (hourlyRes.success) setHourlyActivity(hourlyRes.data);

      // 에러 분석
      const errorRes = await window.electron.ipcRenderer.invoke('get-error-analysis') as any;
      if (errorRes.success) setErrorAnalysis(errorRes.data);

      // 세션 분석
      const sessionRes = await window.electron.ipcRenderer.invoke('get-session-analysis') as any;
      if (sessionRes.success) setSessionAnalysis(sessionRes.data);

      // 최근 로그
      const logsRes = await window.electron.ipcRenderer.invoke('get-recent-logs', 50) as any;
      if (logsRes.success) setRecentLogs(logsRes.data);

    } catch (error) {
      console.error('분석 데이터 로드 실패:', error);
      showToast('분석 데이터 로드에 실패했습니다');
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const formatActionType = (actionType: string) => {
    const typeMap: Record<string, string> = {
      'create_card': '카드 생성',
      'delete_card': '카드 삭제',
      'create_relation': '관계 생성',
      'delete_relation': '관계 삭제',
      'create_cardtype': '카드타입 생성',
      'create_relationtype': '관계타입 생성',
      'navigate_to_page': '페이지 방문',
      'restore_card': '카드 복구',
      'restore_relation': '관계 복구'
    };
    return typeMap[actionType] || actionType;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div style={{
      height: '100vh',
      overflowY: 'auto',
      padding: 0
    }}>
      <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto', paddingBottom: 40 }}>
      {/* 토스트 메시지 */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          background: '#0066cc',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 1000,
          fontSize: 14
        }}>
          {toast}
        </div>
      )}

      <h2 style={{ marginTop: 0, marginBottom: 32, color: '#fff' }}>사용 분석</h2>

      {/* 탭 메뉴 */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 24,
        borderBottom: '1px solid #333'
      }}>
        {[
          { key: 'overview', label: '개요' },
          { key: 'activity', label: '활동 패턴' },
          { key: 'errors', label: '에러 분석' },
          { key: 'sessions', label: '세션 분석' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #0066cc' : '2px solid transparent',
              background: activeTab === tab.key ? '#1e1e1e' : 'transparent',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? '#0066cc' : '#666'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 개요 탭 */}
      {activeTab === 'overview' && stats && (
        <div>
          {/* 기본 통계 카드들 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 32
          }}>
            {[
              { label: '총 액션 수', value: stats.total_actions?.count || 0, color: '#0066cc' },
              { label: '총 세션 수', value: stats.total_sessions?.count || 0, color: '#28a745' },
              { label: '생성된 카드', value: stats.total_cards_created?.count || 0, color: '#ffc107' },
              { label: '생성된 관계', value: stats.total_relations_created?.count || 0, color: '#17a2b8' },
              { label: '삭제된 카드', value: stats.total_cards_deleted?.count || 0, color: '#dc3545' },
              { label: '에러 발생', value: stats.total_errors?.count || 0, color: '#fd7e14' },
              { label: '최근 7일 액션', value: stats.last_7_days_actions?.count || 0, color: '#6f42c1' },
              { label: '평균 세션 시간', value: `${(stats.avg_session_duration?.avg_minutes || 0).toFixed(1)}분`, color: '#20c997' }
            ].map((stat, index) => (
              <div key={index} style={{
                background: '#1e1e1e',
                border: '1px solid #333',
                borderRadius: 8,
                padding: 16,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: stat.color, marginBottom: 8 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 14, color: '#888' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* 기능별 사용 빈도 */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ color: '#fff', marginBottom: 16 }}>기능별 사용 빈도</h3>
            <div style={{
              background: '#1e1e1e',
              borderRadius: 8,
              border: '1px solid #333',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#2a2a2a' }}>
                    <th style={{ padding: 12, textAlign: 'left', color: '#fff', borderBottom: '1px solid #333' }}>기능</th>
                    <th style={{ padding: 12, textAlign: 'center', color: '#fff', borderBottom: '1px solid #333' }}>총 사용</th>
                    <th style={{ padding: 12, textAlign: 'center', color: '#fff', borderBottom: '1px solid #333' }}>성공</th>
                    <th style={{ padding: 12, textAlign: 'center', color: '#fff', borderBottom: '1px solid #333' }}>에러</th>
                    <th style={{ padding: 12, textAlign: 'center', color: '#fff', borderBottom: '1px solid #333' }}>평균 시간</th>
                  </tr>
                </thead>
                <tbody>
                  {actionFrequency.slice(0, 10).map((action, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #333' }}>
                      <td style={{ padding: 12, color: '#fff' }}>{formatActionType(action.action_type)}</td>
                      <td style={{ padding: 12, textAlign: 'center', color: '#888' }}>{action.count}</td>
                      <td style={{ padding: 12, textAlign: 'center', color: '#28a745' }}>{action.success_count}</td>
                      <td style={{ padding: 12, textAlign: 'center', color: action.error_count > 0 ? '#dc3545' : '#888' }}>
                        {action.error_count}
                      </td>
                      <td style={{ padding: 12, textAlign: 'center', color: '#888' }}>
                        {action.avg_duration_ms ? formatDuration(action.avg_duration_ms) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 활동 패턴 탭 */}
      {activeTab === 'activity' && (
        <div>
          {/* 일별 활동 */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ color: '#fff', marginBottom: 16 }}>일별 활동 (최근 30일)</h3>
            <div style={{
              background: '#1e1e1e',
              borderRadius: 8,
              border: '1px solid #333',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#2a2a2a' }}>
                    <th style={{ padding: 12, textAlign: 'left', color: '#fff', borderBottom: '1px solid #333' }}>날짜</th>
                    <th style={{ padding: 12, textAlign: 'center', color: '#fff', borderBottom: '1px solid #333' }}>총 액션</th>
                    <th style={{ padding: 12, textAlign: 'center', color: '#fff', borderBottom: '1px solid #333' }}>세션</th>
                    <th style={{ padding: 12, textAlign: 'center', color: '#fff', borderBottom: '1px solid #333' }}>카드 생성</th>
                    <th style={{ padding: 12, textAlign: 'center', color: '#fff', borderBottom: '1px solid #333' }}>관계 생성</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyActivity.slice(0, 14).map((day, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #333' }}>
                      <td style={{ padding: 12, color: '#fff' }}>{day.date}</td>
                      <td style={{ padding: 12, textAlign: 'center', color: '#888' }}>{day.action_count}</td>
                      <td style={{ padding: 12, textAlign: 'center', color: '#888' }}>{day.session_count}</td>
                      <td style={{ padding: 12, textAlign: 'center', color: '#ffc107' }}>{day.cards_created}</td>
                      <td style={{ padding: 12, textAlign: 'center', color: '#17a2b8' }}>{day.relations_created}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 시간대별 활동 */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ color: '#fff', marginBottom: 16 }}>시간대별 활동</h3>
            <div style={{
              background: '#1e1e1e',
              borderRadius: 8,
              border: '1px solid #333',
              padding: 20
            }}>
              <div style={{ display: 'flex', alignItems: 'end', gap: 4, height: 200 }}>
                {Array.from({ length: 24 }, (_, i) => {
                  const hourData = hourlyActivity.find(h => parseInt(h.hour) === i);
                  const count = hourData?.action_count || 0;
                  const maxCount = Math.max(...hourlyActivity.map(h => h.action_count), 1);
                  const height = (count / maxCount) * 150;

                  return (
                    <div key={i} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: 1,
                      minWidth: 20
                    }}>
                      <div
                        style={{
                          background: count > 0 ? '#0066cc' : '#333',
                          width: '100%',
                          height: Math.max(height, 2),
                          borderRadius: '2px 2px 0 0',
                          marginBottom: 4,
                          minHeight: 2
                        }}
                        title={`${i}시: ${count}개 액션`}
                      />
                      <div style={{ fontSize: 10, color: '#666' }}>{i}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ textAlign: 'center', marginTop: 16, color: '#888', fontSize: 12 }}>
                시간 (0-23시)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 에러 분석 탭 */}
      {activeTab === 'errors' && (
        <div>
          <h3 style={{ color: '#fff', marginBottom: 16 }}>에러 분석</h3>
          {errorAnalysis.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: 40 }}>
              에러가 발생하지 않았습니다.
            </p>
          ) : (
            <div style={{
              background: '#1e1e1e',
              borderRadius: 8,
              border: '1px solid #333',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#2a2a2a' }}>
                    <th style={{ padding: 12, textAlign: 'left', color: '#fff', borderBottom: '1px solid #333' }}>기능</th>
                    <th style={{ padding: 12, textAlign: 'left', color: '#fff', borderBottom: '1px solid #333' }}>에러 메시지</th>
                    <th style={{ padding: 12, textAlign: 'center', color: '#fff', borderBottom: '1px solid #333' }}>발생 횟수</th>
                    <th style={{ padding: 12, textAlign: 'left', color: '#fff', borderBottom: '1px solid #333' }}>마지막 발생</th>
                  </tr>
                </thead>
                <tbody>
                  {errorAnalysis.map((error, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #333' }}>
                      <td style={{ padding: 12, color: '#fff' }}>{formatActionType(error.action_type)}</td>
                      <td style={{ padding: 12, color: '#dc3545' }}>{error.error_message}</td>
                      <td style={{ padding: 12, textAlign: 'center', color: '#888' }}>{error.count}</td>
                      <td style={{ padding: 12, color: '#888' }}>
                        {new Date(error.last_occurrence).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 세션 분석 탭 */}
      {activeTab === 'sessions' && (
        <div>
          <h3 style={{ color: '#fff', marginBottom: 16 }}>세션 분석 (최근 50개)</h3>
          <div style={{
            background: '#1e1e1e',
            borderRadius: 8,
            border: '1px solid #333',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#2a2a2a' }}>
                  <th style={{ padding: 12, textAlign: 'left', color: '#fff', borderBottom: '1px solid #333' }}>시작 시간</th>
                  <th style={{ padding: 12, textAlign: 'center', color: '#fff', borderBottom: '1px solid #333' }}>지속 시간</th>
                  <th style={{ padding: 12, textAlign: 'center', color: '#fff', borderBottom: '1px solid #333' }}>총 액션</th>
                  <th style={{ padding: 12, textAlign: 'center', color: '#fff', borderBottom: '1px solid #333' }}>카드 생성</th>
                  <th style={{ padding: 12, textAlign: 'center', color: '#fff', borderBottom: '1px solid #333' }}>관계 생성</th>
                  <th style={{ padding: 12, textAlign: 'center', color: '#fff', borderBottom: '1px solid #333' }}>에러</th>
                </tr>
              </thead>
              <tbody>
                {sessionAnalysis.map((session, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ padding: 12, color: '#fff' }}>
                      {new Date(session.start_time).toLocaleString()}
                    </td>
                    <td style={{ padding: 12, textAlign: 'center', color: '#888' }}>
                      {session.duration_minutes ? `${session.duration_minutes.toFixed(1)}분` : '-'}
                    </td>
                    <td style={{ padding: 12, textAlign: 'center', color: '#888' }}>{session.action_count}</td>
                    <td style={{ padding: 12, textAlign: 'center', color: '#ffc107' }}>{session.cards_created}</td>
                    <td style={{ padding: 12, textAlign: 'center', color: '#17a2b8' }}>{session.relations_created}</td>
                    <td style={{ padding: 12, textAlign: 'center', color: session.errors > 0 ? '#dc3545' : '#888' }}>
                      {session.errors}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function RelationManage() {
  const [relations, setRelations] = useState<any[]>([]);
  const [cards, setCards] = useState<{id:string; title:string}[]>([]);
  const [relTypes, setRelTypes] = useState<{relationtype_id:number; typename:string}[]>([]);
  const [src, setSrc] = useState('');
  const [rt, setRt] = useState('');
  const [tgt, setTgt] = useState('');

  // 필터링 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState('id'); // 'id', 'source', 'type', 'target'
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const load = async () => {
    const res = await window.electron.ipcRenderer.invoke('get-relations') as any;
    if(res.success) setRelations(res.data);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    (async () => {
      const c = await window.electron.ipcRenderer.invoke('get-cards') as any;
      if(c.success) setCards(c.data);
      const r = await window.electron.ipcRenderer.invoke('get-relationtypes') as any;
      if(r.success) setRelTypes(r.data);
    })();
  }, []);

  const addRelation = async () => {
    if(!src || !rt || !tgt) return;

    // Source와 Target이 같은 경우 방지
    if(src === tgt) {
      alert('자기 자신과의 관계는 만들 수 없습니다');
      return;
    }

    const res = await window.electron.ipcRenderer.invoke('create-relation', {
      relationtype_id: Number(rt),
      source: src,
      target: tgt
    }) as any;
    if(res.success) {
      setSrc('');
      setRt('');
      setTgt('');
      load();
    }
  };

  const del = async (id: number) => {
    await window.electron.ipcRenderer.invoke('delete-relation', id);
    load();
  };

  // 필터링된 관계 목록
  const filteredRelations = relations.filter(relation => {
    // 검색어 필터
    const searchMatch = searchTerm === '' ||
      (relation.source_title || relation.source).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (relation.target_title || relation.target).toLowerCase().includes(searchTerm.toLowerCase()) ||
      relation.typename.toLowerCase().includes(searchTerm.toLowerCase());

    // 관계 타입 필터
    const typeMatch = filterType === '' || relation.relationtype_id === Number(filterType);

    return searchMatch && typeMatch;
  });

  // 정렬된 관계 목록
  const sortedRelations = [...filteredRelations].sort((a, b) => {
    let aVal, bVal;

    switch(sortBy) {
      case 'source':
        aVal = (a.source_title || a.source).toLowerCase();
        bVal = (b.source_title || b.source).toLowerCase();
        break;
      case 'type':
        aVal = a.typename.toLowerCase();
        bVal = b.typename.toLowerCase();
        break;
      case 'target':
        aVal = (a.target_title || a.target).toLowerCase();
        bVal = (b.target_title || b.target).toLowerCase();
        break;
      case 'id':
      default:
        aVal = a.relation_id;
        bVal = b.relation_id;
        break;
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // 필터 초기화
  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('');
    setSortBy('id');
    setSortOrder('asc');
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 0 }}>
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ marginTop: 0, marginBottom: 24, color: '#fff' }}>관계 목록</h2>

      {/* 관계 추가 섹션 */}
      <div style={{
        background: '#1e1e1e',
        padding: 20,
        borderRadius: 8,
        border: '1px solid #333',
        marginBottom: 24
      }}>
        <h3 style={{ marginTop: 0, marginBottom: 16, color: '#fff' }}>새 관계 추가</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid #555',
              background: '#2a2a2a',
              color: '#fff',
              minWidth: 150
            }}
          >
            <option value="">Source 카드 선택</option>
            {cards.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
        </select>
          <select
            value={rt}
            onChange={(e) => setRt(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid #555',
              background: '#2a2a2a',
              color: '#fff',
              minWidth: 120
            }}
          >
            <option value="">관계 타입</option>
            {relTypes.map(r => (
              <option key={r.relationtype_id} value={r.relationtype_id}>{r.typename}</option>
            ))}
        </select>
          <select
            value={tgt}
            onChange={(e) => setTgt(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid #555',
              background: '#2a2a2a',
              color: '#fff',
              minWidth: 150
            }}
          >
            <option value="">Target 카드 선택</option>
            {cards.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
        </select>
          <button
            onClick={addRelation}
            disabled={!src || !rt || !tgt}
            style={{
              padding: '8px 16px',
              background: (!src || !rt || !tgt) ? '#555' : '#0066cc',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: (!src || !rt || !tgt) ? 'not-allowed' : 'pointer'
            }}
          >
            추가
          </button>
      </div>
      </div>

      {/* 필터링 섹션 */}
      <div style={{
        background: '#1e1e1e',
        padding: 20,
        borderRadius: 8,
        border: '1px solid #333',
        marginBottom: 24
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: '#fff' }}>필터 및 정렬</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#888' }}>
            <span>총 {filteredRelations.length}개 / {relations.length}개</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* 검색 */}
          <input
            type="text"
            placeholder="카드명 또는 관계타입 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid #555',
              background: '#2a2a2a',
              color: '#fff',
              minWidth: 200
            }}
          />

          {/* 관계 타입 필터 */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid #555',
              background: '#2a2a2a',
              color: '#fff',
              minWidth: 120
            }}
          >
            <option value="">모든 타입</option>
            {relTypes.map(r => (
              <option key={r.relationtype_id} value={r.relationtype_id}>{r.typename}</option>
            ))}
          </select>

          {/* 정렬 기준 */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid #555',
              background: '#2a2a2a',
              color: '#fff',
              minWidth: 100
            }}
          >
            <option value="id">ID 순</option>
            <option value="source">Source 순</option>
            <option value="type">타입 순</option>
            <option value="target">Target 순</option>
          </select>

          {/* 정렬 순서 */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            style={{
              padding: '8px 12px',
              background: '#444',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: 4,
              cursor: 'pointer',
              minWidth: 60
            }}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>

          {/* 필터 초기화 */}
          <button
            onClick={clearFilters}
            style={{
              padding: '8px 16px',
              background: '#666',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            초기화
          </button>
        </div>
      </div>

      {/* 관계 목록 테이블 */}
      <div style={{
        background: '#1e1e1e',
        borderRadius: 8,
        border: '1px solid #333',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#2a2a2a' }}>
              <th style={{
                padding: 12,
                textAlign: 'left',
                color: '#fff',
                borderBottom: '1px solid #333',
                cursor: 'pointer'
              }} onClick={() => setSortBy('id')}>
                ID {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{
                padding: 12,
                textAlign: 'left',
                color: '#fff',
                borderBottom: '1px solid #333',
                cursor: 'pointer'
              }} onClick={() => setSortBy('source')}>
                Source {sortBy === 'source' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{
                padding: 12,
                textAlign: 'left',
                color: '#fff',
                borderBottom: '1px solid #333',
                cursor: 'pointer'
              }} onClick={() => setSortBy('type')}>
                Type {sortBy === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{
                padding: 12,
                textAlign: 'left',
                color: '#fff',
                borderBottom: '1px solid #333',
                cursor: 'pointer'
              }} onClick={() => setSortBy('target')}>
                Target {sortBy === 'target' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{
                padding: 12,
                textAlign: 'center',
                color: '#fff',
                borderBottom: '1px solid #333'
              }}>
                작업
              </th>
            </tr>
          </thead>
        <tbody>
            {sortedRelations.length === 0 ? (
              <tr>
                <td colSpan={5} style={{
                  padding: 40,
                  textAlign: 'center',
                  color: '#666',
                  borderBottom: '1px solid #333'
                }}>
                  {relations.length === 0 ? '관계가 없습니다.' : '검색 조건에 맞는 관계가 없습니다.'}
                </td>
            </tr>
            ) : (
              sortedRelations.map(r => (
                <tr key={r.relation_id} style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: 12, color: '#888' }}>{r.relation_id}</td>
                  <td style={{ padding: 12, color: '#fff' }}>{r.source_title || r.source}</td>
                  <td style={{ padding: 12, color: '#0066cc' }}>{r.typename}</td>
                  <td style={{ padding: 12, color: '#fff' }}>{r.target_title || r.target}</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    <button
                      onClick={() => del(r.relation_id)}
                      style={{
                        padding: '4px 12px',
                        background: '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12
                      }}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
        </tbody>
      </table>
      </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <nav style={{ padding: 12, background: '#222', flexShrink: 0 }}>
        {[
          { to: '/', label: '홈' },
          { to: '/visualization', label: '시각화' },
          { to: '/cardtypes', label: '카드타입' },
          { to: '/relationtypes', label: '관계타입' },
          { to: '/relations', label: '관계' },
            { to: '/projects', label: '프로젝트' },
          { to: '/trash', label: '휴지통' },
          { to: '/analytics', label: '분석' },
          { to: '/settings', label: '설정' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => {
              // 페이지 방문 로깅
              window.electron.ipcRenderer.invoke('log-page-visit', item.to.substring(1) || 'home');
            }}
            style={{ color: '#fff', marginRight: 16, textDecoration: 'none' }}
          >
            {item.label}
          </Link>
        ))}
      </nav>

        <div style={{ flex: 1, overflow: 'hidden' }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/visualization" element={<Visualization />} />
        <Route path="/cardtypes" element={<CardTypeManage />} />
        <Route path="/relationtypes" element={<RelationTypeManage />} />
        <Route path="/relations" element={<RelationManage />} />
            <Route path="/projects" element={<ProjectManage />} />
        <Route path="/trash" element={<TrashManage />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
        </div>
      </div>
    </Router>
  );
}

// --------------------------------------------------------------
// Relation 입력 폼
// --------------------------------------------------------------

function RelationForm({ cards, refreshCards }: { cards: { id: string; title: string }[]; refreshCards: ()=>void; }) {
  // 상태
  const [relationType, setRelationType] = useState('1');
  const [sourceCard, setSourceCard] = useState('');
  const [targetCard, setTargetCard] = useState('');

  const relationTypeOptions = [
    { id: 1, name: 'for' },
    { id: 2, name: 'need' },
    { id: 3, name: 'before' },
    { id: 4, name: 'after' },
  ];

  const handleSubmit = async () => {
    if (!sourceCard || !targetCard) return;

    let srcId = sourceCard;
    let tgtId = targetCard;

    // 소스 카드가 존재하지 않으면 새로 생성
    const srcFound = cards.find(c => c.id === sourceCard || c.title === sourceCard);
    if (!srcFound) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = (await window.electron.ipcRenderer.invoke('create-card', { title: sourceCard })) as any;
      if (res.success) {
        srcId = res.data.id;
        setSourceCard(srcId); // 셀렉트가 비워지지 않도록 갱신
      } else if (res.error === 'duplicate-title') {
        const dup = cards.find(c => c.title === sourceCard);
        if (dup) srcId = dup.id;
      }
    } else {
      srcId = srcFound.id;
    }

    // 타겟 카드가 존재하지 않으면 새로 생성 (기존 로직과 동일하게 빈칸 유지)
    const tgtFound = cards.find(c => c.id === targetCard || c.title === targetCard);
    if (!tgtFound) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = (await window.electron.ipcRenderer.invoke('create-card', { title: targetCard })) as any;
      if (res.success) {
        tgtId = res.data.id;
      } else if (res.error === 'duplicate-title') {
        const dup = cards.find(c => c.title === targetCard);
        if (dup) tgtId = dup.id;
      }
    } else {
      tgtId = tgtFound.id;
    }

    // Source와 Target이 같은 경우 방지
    if (srcId === tgtId) {
      alert('자기 자신과의 관계는 만들 수 없습니다');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await window.electron.ipcRenderer.invoke(
      'create-relation',
      {
        relationtype_id: Number(relationType),
        source: srcId,
        target: tgtId,
      },
    )) as any;

    if (result.success) {
      // SourceCard 유지, TargetCard 초기화
      setTargetCard('');
      refreshCards();
    }
  };

  return (
    <div>
      <h3>New Relation</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select
          value={sourceCard}
          onChange={(e) => setSourceCard(e.target.value)}
          style={{ flex: '1 0 150px' }}
        >
          <option value="">Source Card 선택</option>
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.title} ({card.id})
            </option>
          ))}
        </select>
        <select
          value={relationType}
          onChange={(e) => setRelationType(e.target.value)}
          style={{ flex: '0 0 120px' }}
        >
          {relationTypeOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
        <select
          value={targetCard}
          onChange={(e) => setTargetCard(e.target.value)}
          style={{ flex: '1 0 150px' }}
        >
          <option value="">Target Card 선택</option>
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.title} ({card.id})
            </option>
          ))}
        </select>
        <button type="button" onClick={handleSubmit}>
          Save
        </button>
      </div>
    </div>
  );
}
