import React, { useEffect, useState, useCallback, createContext, useContext, useRef } from 'react';
import { MemoryRouter as Router, Routes, Route, Link } from 'react-router-dom';
// 일단 기본 그래프뷰로 되돌리고 나중에 고급 라이브러리 적용
// import ForceGraph2D from 'react-force-graph';
// import ForceGraph3D from 'react-force-graph/dist/forcegraph3d';
// D3는 react-force-graph에 내장되어 있어서 별도 import 불필요
import { motion } from 'framer-motion';
import { Plus, GitBranch, ArrowRight, X, ChevronLeft, ChevronRight } from 'lucide-react';
import './App.css';
import { initLanguage, getLanguage, setLanguage, t, type Language } from './i18n';
import { applyTheme, themeNames, type Theme, getThemeColors } from './theme';
import ScheduleAndBudget from './ScheduleAndBudget';

interface Project {
  project_id: string;
  project_name: string;
  createdat: string;
}

// --------------------------------------------
// 공통 조회용 테이블 컴포넌트
// --------------------------------------------
function GenericTable({ data }: { data: Record<string, unknown>[] }) {
  if (!data.length) return <p style={{ color: 'var(--text-muted)' }}>데이터가 없습니다.</p>;
  const keys = Object.keys(data[0]);
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <thead>
        <tr>
          {keys.map((k) => (
            <th key={k} style={{ textAlign: 'left', borderBottom: '1px solid var(--border-dark)', padding: '4px', wordBreak:'break-all' }}>{k}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            {keys.map((k) => (
              <td key={k} style={{ padding: '4px', borderBottom: '1px solid var(--border)', wordBreak: 'break-all' }}>
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
            backgroundColor: 'var(--success)',
            color: 'var(--text-primary)',
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
        <div style={{ flex: '0 0 300px', border: '1px solid var(--border)', borderRadius: '4px', padding: '10px' }}>
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
                <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', marginTop: '4px' }}>
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
                      backgroundColor: 'var(--info)',
                      color: 'var(--text-primary)',
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
                      backgroundColor: 'var(--error)',
                      color: 'var(--text-primary)',
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
        <div style={{ flex: '1', border: '1px solid var(--border)', borderRadius: '4px', padding: '10px' }}>
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
                          border: '1px solid var(--border-dark)',
                          borderRadius: '4px',
                          backgroundColor: '#1a1a1a'
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                          {card.title}
                        </div>
                        {card.content && (
                          <div style={{ fontSize: '0.9em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
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
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '50px' }}>
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
            backgroundColor: 'var(--bg-modal)', padding: '30px', borderRadius: '8px',
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
                backgroundColor: 'var(--bg-darker)', color: 'var(--text-primary)',
                border: '1px solid var(--border-dark)', borderRadius: '4px'
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
                  color: 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={createProject}
                style={{
                  padding: '8px 16px', backgroundColor: 'var(--success)',
                  color: 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer'
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
            backgroundColor: 'var(--bg-modal)', padding: '30px', borderRadius: '8px',
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
                backgroundColor: 'var(--bg-darker)', color: 'var(--text-primary)',
                border: '1px solid var(--border-dark)', borderRadius: '4px'
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
                  color: 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={updateProject}
                style={{
                  padding: '8px 16px', backgroundColor: 'var(--success)',
                  color: 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer'
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

// DB 설정 컴포넌트
function DatabaseSettings() {
  const [dbSettings, setDbSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [recentDbPaths, setRecentDbPaths] = useState<string[]>([]);
  const [localDatabases, setLocalDatabases] = useState<any[]>([]);

  // 설정 로드
  useEffect(() => {
    loadDbSettings();
    loadRecentDbPaths();
    loadLocalDatabases();
  }, []);

  const loadDbSettings = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('get-settings');
      if (result.success) {
        setDbSettings(result.data);
      } else {
        setMessage('설정을 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setMessage('설정을 불러오는 중 오류가 발생했습니다.');
    }
  };

  const loadRecentDbPaths = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('get-recent-db-paths');
      if (result.success) {
        setRecentDbPaths(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load recent DB paths:', error);
    }
  };

  const loadLocalDatabases = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('get-local-databases');
      if (result.success) {
        setLocalDatabases(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load local databases:', error);
    }
  };

  const restartAfterDatabaseChange = async () => {
    setMessage('DB 경로가 변경되었습니다. 현재 실행 중인 DB와 설정 불일치를 막기 위해 앱을 재시작합니다.');
    await window.electron.ipcRenderer.invoke('restart-app');
  };

  const handleSelectDatabasePath = async () => {
    try {
      setLoading(true);
      const result = await window.electron.ipcRenderer.invoke('select-database-path');

      if (result.success && result.path) {
        const changeResult = await window.electron.ipcRenderer.invoke('change-database-path', result.path);

        if (changeResult.success) {
          setMessage(changeResult.message);
          setDbSettings((prev: any) => ({ ...prev, dbPath: result.path }));

          if (changeResult.requiresRestart) {
            await restartAfterDatabaseChange();
          }
        } else {
          setMessage('DB 경로 변경에 실패했습니다: ' + changeResult.error);
        }
      } else if (!result.canceled) {
        setMessage('DB 경로 선택에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to select database path:', error);
      setMessage('DB 경로 선택 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 최근 DB 경로 선택
  const handleSelectRecentDb = async (dbPath: string) => {
    try {
      setLoading(true);
      const result = await window.electron.ipcRenderer.invoke('change-database-path', dbPath);

      if (result.success) {
        setMessage('DB 경로가 변경되었습니다. 앱을 재시작해주세요.');
        loadDbSettings();
        loadRecentDbPaths();

        if (result.requiresRestart) {
          await restartAfterDatabaseChange();
        }
      } else {
        setMessage(`DB 경로 변경 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to change database path:', error);
      setMessage('DB 경로 변경 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 최근 DB 경로에서 제거
  const handleRemoveRecentDb = async (dbPath: string) => {
    try {
      const result = await window.electron.ipcRenderer.invoke('remove-recent-db-path', dbPath);
      if (result.success) {
        loadRecentDbPaths(); // 목록 새로고침
      }
    } catch (error) {
      console.error('Failed to remove recent DB path:', error);
    }
  };

  // 새 DB 파일 생성
  const handleCreateNewDatabase = async () => {
    try {
      setLoading(true);
      const result = await window.electron.ipcRenderer.invoke('create-new-database-path');

      if (result.success && result.path) {
        const changeResult = await window.electron.ipcRenderer.invoke('change-database-path', result.path);

        if (changeResult.success) {
          setMessage('새 DB 파일이 생성되었습니다. 앱을 재시작해주세요.');
          loadDbSettings();
          loadRecentDbPaths();
          loadLocalDatabases();

          if (changeResult.requiresRestart) {
            await restartAfterDatabaseChange();
          }
        } else {
          setMessage(`새 DB 생성 실패: ${changeResult.error}`);
        }
      } else if (!result.canceled) {
        setMessage('새 DB 파일 경로 선택에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to create new database:', error);
      setMessage('새 DB 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 로컬 DB 선택
  const handleSelectLocalDb = async (dbPath: string) => {
    try {
      setLoading(true);
      const result = await window.electron.ipcRenderer.invoke('change-database-path', dbPath);

      if (result.success) {
        setMessage('DB가 변경되었습니다. 앱을 재시작해주세요.');
        loadDbSettings();
        loadRecentDbPaths();

        if (result.requiresRestart) {
          await restartAfterDatabaseChange();
        }
      } else {
        setMessage(`DB 변경 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to select local database:', error);
      setMessage('로컬 DB 선택 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 로컬 DB 삭제
  const handleDeleteLocalDb = async (dbPath: string, dbName: string) => {
    if (!window.confirm(`정말로 "${dbName}" 데이터베이스를 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      const result = await window.electron.ipcRenderer.invoke('delete-local-database', dbPath);
      if (result.success) {
        setMessage(`"${dbName}" 데이터베이스가 삭제되었습니다.`);
        loadLocalDatabases(); // 목록 새로고침
      } else {
        setMessage(`DB 삭제 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to delete local database:', error);
      setMessage('로컬 DB 삭제 중 오류가 발생했습니다.');
    }
  };

  // Finder에서 보기
  const handleShowInFinder = async (dbPath: string) => {
    try {
      await window.electron.ipcRenderer.invoke('show-in-finder', dbPath);
    } catch (error) {
      console.error('Failed to show in finder:', error);
      setMessage('Finder에서 보기 중 오류가 발생했습니다.');
    }
  };

  return (
    <div style={{ marginBottom: 24 }}>
      {message && (
        <div style={{
          background: message.includes('실패') || message.includes('오류') ? 'var(--error)' : 'var(--success)',
          color: 'var(--text-primary)',
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 20,
          fontSize: 14
        }}>
          {message}
        </div>
      )}

      {dbSettings && (
        <div style={{
          background: 'var(--bg-dark)',
          border: '1px solid #444',
          borderRadius: 8,
          padding: 24
        }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 16, fontSize: 18 }}>
            🗄️ 데이터베이스 설정
          </h3>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 8, fontSize: 14 }}>
              현재 DB 경로:
            </label>
            <div style={{
              background: 'var(--panel)',
              color: 'var(--text-primary)',
              padding: '8px 12px',
              borderRadius: 4,
              fontSize: 13,
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              border: '1px solid #555'
            }}>
              {dbSettings.dbPath || '경로 정보 없음'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={handleSelectDatabasePath}
              disabled={loading}
              style={{
                background: loading ? '#666' : '#4CAF50',
                color: 'var(--text-primary)',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 6,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 'bold',
                flex: 1,
                minWidth: '150px'
              }}
            >
              {loading ? '처리 중...' : '📂 기존 DB 선택'}
            </button>
            <button
              onClick={handleCreateNewDatabase}
              disabled={loading}
              style={{
                background: loading ? '#666' : '#2196F3',
                color: 'var(--text-primary)',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 6,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 'bold',
                flex: 1,
                minWidth: '150px'
              }}
            >
              {loading ? '처리 중...' : '🆕 새 DB 생성'}
            </button>
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
            <div style={{ marginBottom: 6 }}>
              📂 <strong>기존 DB 선택</strong>: 이미 있는 데이터베이스 파일을 선택합니다.
            </div>
            <div>
              🆕 <strong>새 DB 생성</strong>: 새로운 빈 데이터베이스 파일을 생성합니다.
            </div>
          </div>

          {/* 최근 사용한 DB 목록 */}
          {recentDbPaths.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: 14 }}>
                📂 최근 사용한 데이터베이스
              </h4>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {recentDbPaths.map((dbPath, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                      padding: 8,
                      background: '#2a2a2a',
                      borderRadius: 4,
                      border: '1px solid #444'
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        fontSize: 11,
                        fontFamily: 'monospace',
                        color: 'var(--text-secondary)',
                        wordBreak: 'break-all'
                      }}
                    >
                      {dbPath}
                    </div>
                    <button
                      onClick={() => handleSelectRecentDb(dbPath)}
                      disabled={loading}
                      style={{
                        background: '#4CAF50',
                        color: 'var(--text-primary)',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: 3,
                        cursor: 'pointer',
                        fontSize: 11
                      }}
                    >
                      선택
                    </button>
                    <button
                      onClick={() => handleRemoveRecentDb(dbPath)}
                      style={{
                        background: '#f44336',
                        color: 'var(--text-primary)',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: 3,
                        cursor: 'pointer',
                        fontSize: 11
                      }}
                    >
                      제거
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 로컬 데이터베이스 목록 */}
          {localDatabases.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: 14 }}>
                💾 로컬 데이터베이스 관리
              </h4>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {localDatabases.map((db, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: 12,
                      padding: 12,
                      background: '#2a2a2a',
                      borderRadius: 6,
                      border: '1px solid #444'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: 4 }}>
                          {db.displayName}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 4 }}>
                          {db.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#666' }}>
                          크기: {(db.size / 1024).toFixed(1)}KB |
                          수정: {new Date(db.modified).toLocaleDateString('ko-KR')} {new Date(db.modified).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleSelectLocalDb(db.path)}
                        disabled={loading}
                        style={{
                          background: '#4CAF50',
                          color: 'var(--text-primary)',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 11,
                          fontWeight: 'bold'
                        }}
                      >
                        📂 선택
                      </button>
                      <button
                        onClick={() => handleShowInFinder(db.path)}
                        style={{
                          background: '#2196F3',
                          color: 'var(--text-primary)',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 11,
                          fontWeight: 'bold'
                        }}
                      >
                        🔍 Finder에서 보기
                      </button>
                      <button
                        onClick={() => handleDeleteLocalDb(db.path, db.displayName)}
                        style={{
                          background: '#f44336',
                          color: 'var(--text-primary)',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 11,
                          fontWeight: 'bold'
                        }}
                      >
                        🗑️ 삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 16, fontSize: 12, color: '#aaa' }}>
            <strong>앱 버전:</strong> {dbSettings.version}<br/>
            <strong>설정 파일:</strong> ~/Library/Application Support/ForNeed/settings.json (macOS)
          </div>
        </div>
      )}
    </div>
  );
}

// 빈 페이지 컴포넌트들
function Home() {
  const [cards, setCards] = useState<{
    id: string;
    title: string;
    cardtype?: string | null;
    complete?: number;
    activate?: number;
    duration?: number;
    content?: string;
    startdate?: string;
    enddate?: string;
    es?: string;
    ls?: string;
    price?: number;
    createdat?: string;
  }[]>([]);
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

  // 완료상태 필터
  const [completionFilter, setCompletionFilter] = useState({
    enabled: (savedFilters && savedFilters.completionFilter && savedFilters.completionFilter.enabled) || false,
    type: (savedFilters && savedFilters.completionFilter && savedFilters.completionFilter.type) || 'completed-only' // 'completed-only' (완료된 것만), 'incomplete-only' (미완료된 것만)
  });

  // 활성상태 필터
  const [activateFilter, setActivateFilter] = useState({
    enabled: (savedFilters && savedFilters.activateFilter && savedFilters.activateFilter.enabled) || false,
    type: (savedFilters && savedFilters.activateFilter && savedFilters.activateFilter.type) || 'active-only' // 'active-only' (활성된 것만), 'inactive-only' (비활성된 것만)
  });

  // 소요시간 필터
  const [durationFilter, setDurationFilter] = useState({
    enabled: (savedFilters && savedFilters.durationFilter && savedFilters.durationFilter.enabled) || false,
    duration: (savedFilters && savedFilters.durationFilter && savedFilters.durationFilter.duration) || '',
    operator: (savedFilters && savedFilters.durationFilter && savedFilters.durationFilter.operator) || 'gte' // 'gte' (이상), 'lte' (이하)
  });

  // 내용 필터
  const [contentFilter, setContentFilter] = useState({
    enabled: (savedFilters && savedFilters.contentFilter && savedFilters.contentFilter.enabled) || false,
    content: (savedFilters && savedFilters.contentFilter && savedFilters.contentFilter.content) || ''
  });

  // 생성일 필터
  const [createDateFilter, setCreateDateFilter] = useState({
    enabled: (savedFilters && savedFilters.createDateFilter && savedFilters.createDateFilter.enabled) || false,
    startDate: (savedFilters && savedFilters.createDateFilter && savedFilters.createDateFilter.startDate) || '',
    endDate: (savedFilters && savedFilters.createDateFilter && savedFilters.createDateFilter.endDate) || ''
  });

  // 프로젝트 필터
  const [projectFilter, setProjectFilter] = useState({
    enabled: (savedFilters && savedFilters.projectFilter && savedFilters.projectFilter.enabled) || false,
    projectIds: (savedFilters && savedFilters.projectFilter && savedFilters.projectFilter.projectIds) || [] as string[]
  });

  // 서브카드 필터의 자동완성 관련 상태
  const [subcardsDropdownVisible, setSubcardsDropdownVisible] = useState(false);
  const [filteredSubcardsTargets, setFilteredSubcardsTargets] = useState<any[]>([]);
  const [subcardsSelectedIndex, setSubcardsSelectedIndex] = useState(-1);

  // 카드 검색 상태
  const [cardSearchTerm, setCardSearchTerm] = useState('');

  // 필터 프리셋 관리
  const loadFilterPresets = () => {
    try {
      const saved = localStorage.getItem('forneed-filter-presets');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.warn('필터 프리셋 로드 실패:', error);
      return [];
    }
  };

  const [filterPresets, setFilterPresets] = useState<any[]>(loadFilterPresets());
  const [currentPresetTab, setCurrentPresetTab] = useState(-1); // 현재 선택된 탭 (-1: 기본 필터)
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  // 필터 프리셋 저장
  const saveFilterPreset = (name: string) => {
    const newPreset = {
      id: Date.now(),
      name,
      filters: {
      sortOptions,
      relationFilter,
      dateFilter,
      subcardsOnlyFilter,
      amountFilter,
      cardTypeFilters,
      completionFilter,
      activateFilter,
      durationFilter,
      contentFilter,
      createDateFilter,
      projectFilter
      }
    };

    const updatedPresets = [...filterPresets, newPreset];
    setFilterPresets(updatedPresets);
    localStorage.setItem('forneed-filter-presets', JSON.stringify(updatedPresets));

    // 저장 후에도 기본 필터 탭에 그대로 유지 (탭 이동하지 않음)
    // 성공 메시지 표시
    setSaveSuccessMessage(`"${name}" 프리셋이 저장되었습니다!`);
    setTimeout(() => setSaveSuccessMessage(''), 3000); // 3초 후 메시지 사라짐
  };

  // 필터 프리셋 로드
  const loadFilterPreset = (preset: any) => {
    const filters = preset.filters;
    setSortOptions(filters.sortOptions || { relationCount: { enabled: false, relationTypes: [], order: 'desc' }, amount: { enabled: false, order: 'desc' } });
    setRelationFilter(filters.relationFilter || { enabled: false, type: 'no-relations' });
    setDateFilter(filters.dateFilter || { enabled: false, type: 'has-date' });
    setSubcardsOnlyFilter(filters.subcardsOnlyFilter || { enabled: false, relationTypeName: '', targetCardTitle: '' });
    setAmountFilter(filters.amountFilter || { enabled: false, amount: '', operator: 'gte' });
    setCardTypeFilters(filters.cardTypeFilters || []);
    setCompletionFilter(filters.completionFilter || { enabled: false, type: 'completed-only' });
    setActivateFilter(filters.activateFilter || { enabled: false, type: 'active-only' });
    setDurationFilter(filters.durationFilter || { enabled: false, duration: '', operator: 'gte' });
    setContentFilter(filters.contentFilter || { enabled: false, content: '' });
    setCreateDateFilter(filters.createDateFilter || { enabled: false, startDate: '', endDate: '' });
    setProjectFilter(filters.projectFilter || { enabled: false, projectIds: [] });
  };

  // 필터 프리셋 삭제
  const deleteFilterPreset = (presetId: number) => {
    const updatedPresets = filterPresets.filter(preset => preset.id !== presetId);
    setFilterPresets(updatedPresets);
    localStorage.setItem('forneed-filter-presets', JSON.stringify(updatedPresets));

    // 현재 탭이 삭제된 경우 첫 번째 탭으로 이동
    if (currentPresetTab >= updatedPresets.length) {
      setCurrentPresetTab(0);
    }
  };

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
    const relationType = relationTypes.find(rt => rt.typename === relationTypeName);
    if (!relationType) return 0;

    return allRelations.filter(rel =>
      rel.source === cardId &&
      rel.relationtype_id === relationType.relationtype_id
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

    // 완료상태 필터 적용
    if (completionFilter && completionFilter.enabled) {
      filteredCards = filteredCards.filter(card => {
        // DB에서 complete는 0(미완료) 또는 1(완료)로 저장됨
        const isCompleted = card.complete === 1;

        // 디버깅용 로그
        console.log(`[완료상태 필터] 카드: "${card.title}", complete 값: ${card.complete}, isCompleted: ${isCompleted}, 필터 타입: ${completionFilter.type}`);

        return completionFilter.type === 'completed-only' ? isCompleted : !isCompleted;
      });
    }

    // 활성상태 필터 적용
    if (activateFilter && activateFilter.enabled) {
      filteredCards = filteredCards.filter(card => {
        // DB에서 activate는 0(비활성) 또는 1(활성)로 저장됨
        const isActive = card.activate === 1;
        return activateFilter.type === 'active-only' ? isActive : !isActive;
      });
    }

    // 소요시간 필터 적용
    if (durationFilter.enabled && durationFilter.duration) {
      const filterDuration = parseInt(durationFilter.duration);
      if (!isNaN(filterDuration)) {
        filteredCards = filteredCards.filter(card => {
          const cardDuration = parseInt(card.duration?.toString() || '0');
          if (durationFilter.operator === 'gte') {
            return cardDuration >= filterDuration;
          } else {
            return cardDuration <= filterDuration;
          }
        });
      }
    }

    // 내용 필터 적용
    if (contentFilter.enabled && contentFilter.content.trim()) {
      filteredCards = filteredCards.filter(card => {
        const content = (card.content || '').toLowerCase();
        return content.includes(contentFilter.content.toLowerCase());
      });
    }

    // 생성일 필터 적용
    if (createDateFilter.enabled && (createDateFilter.startDate || createDateFilter.endDate)) {
      filteredCards = filteredCards.filter(card => {
        const createDate = new Date(card.createdat || '');
        const startDate = createDateFilter.startDate ? new Date(createDateFilter.startDate) : null;
        const endDate = createDateFilter.endDate ? new Date(createDateFilter.endDate) : null;

        if (startDate && createDate < startDate) return false;
        if (endDate && createDate > endDate) return false;
        return true;
      });
    }

    // 프로젝트 필터 적용
    if (projectFilter.enabled && projectFilter.projectIds.length > 0) {
      filteredCards = filteredCards.filter(card => {
        return projectFilter.projectIds.includes((card as any).project_id);
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
        const cardAmount = parseFloat(card.price?.toString() || '0');
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
    if (sortOptions.relationCount.enabled) {
      console.log('정렬 시작:', {
        order: sortOptions.relationCount.order,
        relationTypes: sortOptions.relationCount.relationTypes
      });

      sortedCards.sort((a, b) => {
        let countA = 0, countB = 0;

        if (sortOptions.relationCount.relationTypes.length > 0) {
        // 선택된 관계타입들의 관계 수를 합산
        sortOptions.relationCount.relationTypes.forEach(typeName => {
            const typeCountA = getRelationCountByType(a.id, typeName);
            const typeCountB = getRelationCountByType(b.id, typeName);
            countA += typeCountA;
            countB += typeCountB;
          });
        } else {
          // 관계타입이 선택되지 않은 경우 모든 관계타입의 관계 수를 합산
          relationTypes.forEach(relType => {
            countA += getRelationCountByType(a.id, relType.typename);
            countB += getRelationCountByType(b.id, relType.typename);
          });
        }

        // 디버깅용 로그 (상위 5개 카드만)
        if (filteredCards.indexOf(a) < 5 || filteredCards.indexOf(b) < 5) {
          const typeInfo = sortOptions.relationCount.relationTypes.length > 0
            ? `선택된 타입: ${sortOptions.relationCount.relationTypes.join(', ')}`
            : '모든 관계타입 합산';
          console.log(`정렬 비교: "${a.title}" (${countA}) vs "${b.title}" (${countB}), order: ${sortOptions.relationCount.order}, ${typeInfo}`);
        }

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
        cardTypeFilters,
        completionFilter,
        activateFilter,
        durationFilter,
        contentFilter,
        createDateFilter,
        projectFilter
      };
      localStorage.setItem('forneed-filter-settings', JSON.stringify(filterSettings));
    } catch (error) {
      console.warn('필터 설정 저장 실패:', error);
    }
  }, [sortOptions, relationFilter, dateFilter, subcardsOnlyFilter, amountFilter, cardTypeFilters, completionFilter, activateFilter, durationFilter, contentFilter, createDateFilter, projectFilter]);

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
              color: 'var(--text-primary)',
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
                    background: 'var(--panel)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-dark)',
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
                background: 'var(--panel)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-dark)',
                borderRadius: 4,
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
            {cardSearchTerm && (
              <div style={{
                marginTop: 8,
                fontSize: 12,
                color: 'var(--text-muted)',
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
                    color: 'var(--text-muted)',
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
              color: 'var(--success)',
              marginBottom: 4,
              fontWeight: 'bold'
            }}>
              하위카드만 조회 활성화
            </div>
            <div style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginBottom: 8,
              lineHeight: 1.4
            }}>
              <span style={{ color: '#888' }}>기준:</span>
              <span style={{ color: '#ffa726', fontWeight: 'bold' }}>{subcardsOnlyFilter.relationTypeName}</span>
              {' → '}
              <span
                style={{
                  color: 'var(--success)',
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
              color: 'var(--text-muted)',
              fontStyle: 'italic'
            }}>
              위 목표 카드를 향한 관계 체인의 카드들만 표시 중
            </div>
          </div>
        )}

        {!isLeftCollapsed && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {getSortedCards().map((c) => {
            // 필터링 시스템의 보유관계순 설정을 사용
            let relationCount = 0;
            let displayText = '';

            if (sortOptions.relationCount.enabled) {
              if (sortOptions.relationCount.relationTypes.length > 0) {
                // 선택된 관계타입들의 합계
                sortOptions.relationCount.relationTypes.forEach(typeName => {
                  relationCount += getRelationCountByType(c.id, typeName);
                });
                displayText = sortOptions.relationCount.relationTypes.length === 1
                  ? `${sortOptions.relationCount.relationTypes[0]} ${relationCount}개`
                  : `선택타입 ${relationCount}개`;
              } else {
                // 모든 관계타입 합계
                relationCount = getRelationCount(c.id);
                displayText = `전체관계 ${relationCount}개`;
              }
            } else {
              // 보유관계순이 비활성화된 경우 전체 관계 개수
              relationCount = getRelationCount(c.id);
              displayText = `관계 ${relationCount}개`;
            }

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
                  {displayText}
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
                        color: 'var(--text-primary)',
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
                        color: 'var(--text-primary)',
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
                        color: 'var(--text-primary)',
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
              <select
                className="editor-input"
                value={cardDetail.cardtype ?? ''}
                onChange={(e)=>{
                  const newId = e.target.value ? Number(e.target.value) : null;
                  if (newId !== null) {
                    updateCardField('cardtype', newId);
                  }
                }}
                style={{ flex: 1 }}
              >
                <option value="">선택</option>
                {cardTypes.map((ct) => (
                  <option key={ct.cardtype_id} value={ct.cardtype_id}>{ct.cardtype_name}</option>
                ))}
              </select>
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
            background: 'var(--panel)',
            color: 'var(--text-primary)',
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
                background: 'var(--panel)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-dark)',
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
                style={{ padding: '8px 16px', background: 'var(--text-disabled)', color: 'var(--text-primary)', border: 'none', borderRadius: 4 }}
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
                style={{ padding: '8px 16px', background: '#0066cc', color: 'var(--text-primary)', border: 'none', borderRadius: 4 }}
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
                  background: 'var(--panel)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-dark)',
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
                style={{ padding: '8px 16px', background: 'var(--text-disabled)', color: 'var(--text-primary)', border: 'none', borderRadius: 4 }}
              >
                기본값 복원
              </button>
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{ padding: '8px 16px', background: '#0066cc', color: 'var(--text-primary)', border: 'none', borderRadius: 4 }}
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
              background: 'var(--bg-dark)',
              borderRadius: 8,
              border: '1px solid var(--border-dark)',
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
                  color: 'var(--text-muted)',
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
              <p style={{ color: 'var(--text-primary)', fontSize: 16, lineHeight: 1.5 }}>
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
                  <div style={{ color: 'var(--text-primary)', fontSize: 14 }}>
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
                  color: 'var(--text-primary)',
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
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0, lineHeight: 1.4 }}>
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
              background: 'var(--bg-dark)',
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
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 18 }}>필터링 및 정렬 옵션</h3>
                <button
                  onClick={() => setShowFilterModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: 24,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  ×
                </button>
            </div>

            {/* 저장 성공 메시지 */}
            {saveSuccessMessage && (
              <div style={{
                background: '#4CAF50',
                color: 'var(--text-primary)',
                padding: '8px 12px',
                borderRadius: 4,
                marginBottom: 16,
                textAlign: 'center',
                fontSize: 14,
                animation: 'fadeIn 0.3s ease-in'
              }}>
                {saveSuccessMessage}
              </div>
            )}

            {/* 탭 헤더 */}
            <div style={{ marginBottom: 20, borderBottom: '1px solid #444' }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {/* 기본 필터 탭 */}
                <button
                  onClick={() => setCurrentPresetTab(-1)}
                  style={{
                    background: currentPresetTab === -1 ? '#333' : 'transparent',
                    border: 'none',
                    color: currentPresetTab === -1 ? '#fff' : '#aaa',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    borderBottom: currentPresetTab === -1 ? '2px solid #4CAF50' : 'none'
                  }}
                >
                  기본 필터
                </button>

                {/* 저장된 프리셋 탭들 */}
                {filterPresets.map((preset, index) => (
                  <div key={preset.id} style={{ display: 'flex', alignItems: 'center' }}>
                <button
                      onClick={() => setCurrentPresetTab(index)}
                  style={{
                        background: currentPresetTab === index ? '#333' : 'transparent',
                        border: 'none',
                        color: currentPresetTab === index ? '#fff' : '#aaa',
                    padding: '8px 16px',
                        cursor: 'pointer',
                        borderBottom: currentPresetTab === index ? '2px solid #4CAF50' : 'none'
                      }}
                    >
                      {preset.name}
                    </button>
                    {currentPresetTab === index && (
                      <button
                        onClick={() => loadFilterPreset(preset)}
                        style={{
                    background: '#4CAF50',
                    border: 'none',
                          color: 'var(--text-primary)',
                          fontSize: 12,
                    cursor: 'pointer',
                          padding: '2px 6px',
                          marginLeft: 4,
                          borderRadius: 3
                  }}
                        title="이 프리셋 적용"
                >
                        로드
                </button>
                    )}
                  <button
                      onClick={() => deleteFilterPreset(preset.id)}
                    style={{
                        background: 'none',
                      border: 'none',
                        color: '#f44336',
                        fontSize: 12,
                      cursor: 'pointer',
                        padding: '2px 4px',
                        marginLeft: 4
                    }}
                      title="삭제"
                  >
                      ×
                  </button>
                  </div>
                ))}

                {/* 프리셋 추가 버튼 */}
                  <button
                  onClick={() => setShowPresetModal(true)}
                    style={{
                    background: '#555',
                    border: '1px dashed #777',
                    color: '#aaa',
                    padding: '6px 12px',
                      cursor: 'pointer',
                    borderRadius: 4,
                    fontSize: 16,
                    marginLeft: 8,
                    transition: 'all 0.2s ease'
                  }}
                  title="새 프리셋 저장"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#666';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.borderColor = 'var(--success)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#555';
                    e.currentTarget.style.color = '#aaa';
                    e.currentTarget.style.borderColor = '#777';
                  }}
                >
                  +
                  </button>
              </div>
            </div>


            {/* 1. 하위카드만 조회 */}
            <div style={{ marginBottom: 24, border: '1px solid var(--border-dark)', borderRadius: 8, padding: 16 }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: 16 }}>하위카드만 조회</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', marginBottom: 8 }}>
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
                    <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 4, fontSize: 14 }}>
                      기준 관계 타입:
                    </label>
                    <select
                      value={subcardsOnlyFilter.relationTypeName}
                      onChange={(e) => setSubcardsOnlyFilter(prev => ({ ...prev, relationTypeName: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--border-dark)',
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
                    <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 4, fontSize: 14 }}>
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
                        background: 'var(--panel)',
                        border: `1px solid ${subcardsDropdownVisible ? '#4CAF50' : '#555'}`,
                        borderRadius: subcardsDropdownVisible ? '4px 4px 0 0' : 4,
                        color: 'var(--text-primary)',
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
                        background: 'var(--panel)',
                        border: '1px solid var(--success)',
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
                              <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', marginTop: '2px' }}>
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
                    color: 'var(--text-muted)',
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
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: 16 }}>카드타입 필터</h4>
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
                  background: 'var(--panel)',
                  border: '1px solid var(--border-dark)',
                  color: 'var(--text-secondary)',
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
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: 16 }}>관계 필터</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', marginBottom: 8 }}>
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
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', marginBottom: 4 }}>
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
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: 16 }}>날짜 필터</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', marginBottom: 8 }}>
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
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', marginBottom: 4 }}>
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

            {/* 5. 완료상태 필터 */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: 16 }}>완료상태 필터</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={completionFilter?.enabled || false}
                  onChange={(e) => setCompletionFilter(prev => ({ ...prev, enabled: e.target.checked }))}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span>완료상태 필터링 활성화</span>
              </label>
              {completionFilter?.enabled && (
                <div style={{ marginLeft: 24 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <input
                      type="radio"
                      name="completionFilter"
                      checked={completionFilter?.type === 'completed-only'}
                      onChange={() => setCompletionFilter(prev => ({ ...prev, type: 'completed-only' }))}
                    />
                    <span>완료된 카드만 조회</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ccc' }}>
                    <input
                      type="radio"
                      name="completionFilter"
                      checked={completionFilter?.type === 'incomplete-only'}
                      onChange={() => setCompletionFilter(prev => ({ ...prev, type: 'incomplete-only' }))}
                    />
                    <span>미완료된 카드만 조회</span>
                  </label>
                </div>
              )}
            </div>

            {/* 6. 금액 필터 */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: 16 }}>금액 필터</h4>
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
                        background: 'var(--panel)',
                        border: '1px solid var(--border-dark)',
                        borderRadius: 4,
                        color: 'var(--text-primary)',
                        width: 120
                      }}
                    />
                    <select
                      value={amountFilter.operator}
                      onChange={(e) => setAmountFilter(prev => ({ ...prev, operator: e.target.value as 'gte' | 'lte' }))}
                      style={{
                        padding: '6px 8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--border-dark)',
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

            {/* 7. 활성상태 필터 */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: 16 }}>활성상태 필터</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={activateFilter?.enabled || false}
                  onChange={(e) => setActivateFilter(prev => ({ ...prev, enabled: e.target.checked }))}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span>활성상태 필터링 활성화</span>
              </label>
              {activateFilter?.enabled && (
                <div style={{ marginLeft: 24 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <input
                      type="radio"
                      name="activateFilter"
                      checked={activateFilter?.type === 'active-only'}
                      onChange={() => setActivateFilter(prev => ({ ...prev, type: 'active-only' }))}
                    />
                    <span>활성된 카드만 조회</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ccc' }}>
                    <input
                      type="radio"
                      name="activateFilter"
                      checked={activateFilter?.type === 'inactive-only'}
                      onChange={() => setActivateFilter(prev => ({ ...prev, type: 'inactive-only' }))}
                    />
                    <span>비활성된 카드만 조회</span>
                  </label>
                </div>
              )}
            </div>

            {/* 8. 소요시간 필터 */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: 16 }}>소요시간 필터</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={durationFilter.enabled}
                    onChange={(e) => setDurationFilter(prev => ({ ...prev, enabled: e.target.checked }))}
                  />
                  <span>소요시간 필터링 활성화</span>
                </label>
                {durationFilter.enabled && (
                  <div style={{ marginLeft: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="number"
                      placeholder="시간"
                      value={durationFilter.duration}
                      onChange={(e) => setDurationFilter(prev => ({ ...prev, duration: e.target.value }))}
                      style={{
                        padding: '6px 8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--border-dark)',
                        color: 'var(--text-primary)',
                        borderRadius: 4,
                        width: '100px'
                      }}
                    />
                    <select
                      value={durationFilter.operator}
                      onChange={(e) => setDurationFilter(prev => ({ ...prev, operator: e.target.value as 'gte' | 'lte' }))}
                      style={{
                        padding: '6px 8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--border-dark)',
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

            {/* 9. 내용 필터 */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: 16 }}>내용 필터</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={contentFilter.enabled}
                    onChange={(e) => setContentFilter(prev => ({ ...prev, enabled: e.target.checked }))}
                  />
                  <span>내용 검색 필터링 활성화</span>
                </label>
                {contentFilter.enabled && (
                  <div style={{ marginLeft: 24 }}>
                    <input
                      type="text"
                      placeholder="검색할 내용"
                      value={contentFilter.content}
                      onChange={(e) => setContentFilter(prev => ({ ...prev, content: e.target.value }))}
                      style={{
                        padding: '6px 8px',
                        background: 'var(--panel)',
                        border: '1px solid var(--border-dark)',
                        color: 'var(--text-primary)',
                        borderRadius: 4,
                        width: '200px'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 10. 생성일 필터 */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: 16 }}>생성일 필터</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={createDateFilter.enabled}
                    onChange={(e) => setCreateDateFilter(prev => ({ ...prev, enabled: e.target.checked }))}
                  />
                  <span>생성일 범위 필터링 활성화</span>
                </label>
                {createDateFilter.enabled && (
                  <div style={{ marginLeft: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#aaa', width: '60px' }}>시작일:</span>
                      <input
                        type="date"
                        value={createDateFilter.startDate}
                        onChange={(e) => setCreateDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                        style={{
                          padding: '6px 8px',
                          background: 'var(--panel)',
                          border: '1px solid var(--border-dark)',
                          color: 'var(--text-primary)',
                          borderRadius: 4
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#aaa', width: '60px' }}>종료일:</span>
                      <input
                        type="date"
                        value={createDateFilter.endDate}
                        onChange={(e) => setCreateDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                        style={{
                          padding: '6px 8px',
                          background: 'var(--panel)',
                          border: '1px solid var(--border-dark)',
                          color: 'var(--text-primary)',
                          borderRadius: 4
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 11. 프로젝트 필터 */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: 16 }}>프로젝트 필터</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={projectFilter.enabled}
                    onChange={(e) => setProjectFilter(prev => ({ ...prev, enabled: e.target.checked }))}
                  />
                  <span>프로젝트별 필터링 활성화</span>
                </label>
                {projectFilter.enabled && (
                  <div style={{ marginLeft: 24 }}>
                    <div style={{ marginBottom: 8, fontSize: 14, color: '#aaa' }}>프로젝트 선택 (복수선택 가능):</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 100, overflow: 'auto' }}>
                      {projects.map((project) => (
                        <label key={project.project_id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={projectFilter.projectIds.includes(project.project_id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setProjectFilter(prev => ({
                                  ...prev,
                                  projectIds: [...prev.projectIds, project.project_id]
                                }));
                              } else {
                                setProjectFilter(prev => ({
                                  ...prev,
                                  projectIds: prev.projectIds.filter(id => id !== project.project_id)
                                }));
                              }
                            }}
                          />
                          <span style={{ fontSize: 13 }}>{project.project_name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 12. 정렬 옵션 */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: 16 }}>정렬 옵션</h4>

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
                          background: 'var(--panel)',
                          border: '1px solid var(--border-dark)',
                          color: 'var(--text-primary)',
                          borderRadius: 4,
                          fontSize: 13
                        }}
                      >
                        <option value="desc">많은 것부터 (내림차순)</option>
                        <option value="asc">적은 것부터 (오름차순)</option>
                      </select>
                    </div>
                    <div style={{ marginBottom: 8, fontSize: 14, color: '#aaa' }}>
                      기준 관계타입 (복수선택 가능, 선택하지 않으면 모든 관계타입 합산으로 정렬):
                    </div>
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
                        background: 'var(--panel)',
                        border: '1px solid var(--border-dark)',
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

            </div>

            {/* 적용/초기화 버튼 */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setCardSearchTerm('');
                  setCardTypeFilters([]);
                  setRelationFilter({ enabled: false, type: 'no-relations' });
                  setDateFilter({ enabled: false, type: 'has-date' });
                  setCompletionFilter({ enabled: false, type: 'completed-only' });
                  setActivateFilter({ enabled: false, type: 'active-only' });
                  setDurationFilter({ enabled: false, duration: '', operator: 'gte' });
                  setContentFilter({ enabled: false, content: '' });
                  setCreateDateFilter({ enabled: false, startDate: '', endDate: '' });
                  setProjectFilter({ enabled: false, projectIds: [] });
                  setSubcardsOnlyFilter({ enabled: false, relationTypeName: '', targetCardTitle: '' });
                  setSubcardsDropdownVisible(false);
                  setSubcardsSelectedIndex(-1);
                  setAmountFilter({ enabled: false, amount: '', operator: 'gte' });
                  setSortOptions({
                    relationCount: { enabled: false, relationTypes: [], order: 'desc' },
                    amount: { enabled: false, order: 'desc' }
                  });
                }}
                style={{
                  padding: '8px 16px',
                  background: '#444',
                  border: '1px solid #666',
                  color: 'var(--text-secondary)',
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
                  color: 'var(--text-primary)',
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

      {/* 필터 프리셋 저장 모달 */}
      {showPresetModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'var(--bg-overlay)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
          }}
          onClick={() => {
            setShowPresetModal(false);
            setPresetName('');
          }}
        >
          <div
            style={{
              background: 'var(--bg-dark)',
              border: '1px solid #444',
              borderRadius: 8,
              padding: 24,
              width: '90%',
              maxWidth: 400,
              color: '#fff'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', color: '#fff' }}>필터 프리셋 저장</h3>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, color: '#ccc' }}>
                프리셋 이름:
              </label>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="프리셋 이름을 입력하세요"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--panel)',
                  border: '1px solid var(--border-dark)',
                  borderRadius: 4,
                  color: 'var(--text-primary)',
                  fontSize: 14
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && presetName.trim()) {
                    saveFilterPreset(presetName.trim());
                    setShowPresetModal(false);
                    setPresetName('');
                  } else if (e.key === 'Escape') {
                    setShowPresetModal(false);
                    setPresetName('');
                  }
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowPresetModal(false);
                  setPresetName('');
                }}
                style={{
                  padding: '8px 16px',
                  background: '#555',
                  border: 'none',
                  borderRadius: 4,
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (presetName.trim()) {
                    saveFilterPreset(presetName.trim());
                    setShowPresetModal(false);
                    setPresetName('');
                  }
                }}
                disabled={!presetName.trim()}
                style={{
                  padding: '8px 16px',
                  background: presetName.trim() ? '#4CAF50' : '#666',
                  border: 'none',
                  borderRadius: 4,
                  color: 'var(--text-primary)',
                  cursor: presetName.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                저장
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
            color: 'var(--text-primary)',
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

// 고급 그래프 뷰 컴포넌트 (graph view.tsx 기반)
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
  // graph view.tsx의 Circle과 Arrow 인터페이스에 맞게 변환
  interface Circle {
      id: string;
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
    from: string;
    to: string;
  }

  // 모노크롬 테마: 모든 노드를 흰색으로
  const COLORS = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'];

  // cards를 Circle로, relations를 Arrow로 변환
  const [circles, setCircles] = useState<Circle[]>([]);
  const [arrows, setArrows] = useState<Arrow[]>([]);

  const [draggedCircleId, setDraggedCircleId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const justFinishedDrawing = useRef(false);

  const [arrowMode, setArrowMode] = useState(false);
  const [selectedCircleForArrow, setSelectedCircleForArrow] = useState<string | null>(null);

  const [editingCircleId, setEditingCircleId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const [focusedCircleId, setFocusedCircleId] = useState<string | null>(null);

  // Cmd/Ctrl + 드래그로 화살표 그리기
  const [drawingArrow, setDrawingArrow] = useState<{ fromId: string; x: number; y: number } | null>(null);

  const [selectedRelationType, setSelectedRelationType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [controlPanelOpen, setControlPanelOpen] = useState(true);
  const [detailPanelOpen, setDetailPanelOpen] = useState(true);

  // 줌/패닝 상태
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  const getCircleById = (id: string) => circles.find((c) => c.id === id);

  // 화면 좌표 → 그래프 좌표
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
  const findConnectedGroups = (circlesList: Circle[], arrowsList: Arrow[]): Map<string, string[]> => {
    const parent = new Map<string, string>();

    // 초기화: 각 노드의 부모는 자기 자신
    circlesList.forEach(circle => {
      parent.set(circle.id, circle.id);
    });

    // Find 함수 (경로 압축 포함)
    const find = (id: string): string => {
      if (parent.get(id) !== id) {
        parent.set(id, find(parent.get(id)!));
      }
      return parent.get(id)!;
    };

    // Union 함수
    const union = (id1: string, id2: string) => {
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
    const groups = new Map<string, string[]>();
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
      const valueCache = new Map<string, number>();

      const calculateValue = (nodeId: string, visited: Set<string> = new Set()): number => {
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

        // 중요도 = 해당 노드의 위에 위치한 노드의 갯수
        // = count(깊이가 1인 노드) + sum(깊이가 1인 노드들의 값)
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
    const levelMap = new Map<string, number>();

    // 들어오는 화살표가 없는 노드들을 루트로 설정 (레벨 0)
    const hasIncoming = new Set(arrowsList.map(a => a.to));
    const roots = circlesList.filter(c => !hasIncoming.has(c.id)).map(c => c.id);

    // BFS로 레벨 계산
    const queue: string[] = [];
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
  const calculateRanks = (circlesList: Circle[], groups: Map<string, string[]>): Circle[] => {
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

  // cards와 relations를 Circle과 Arrow로 변환
  useEffect(() => {
    // cards를 Circle로 변환 (기존 위치 유지)
    console.log('[GraphView] cards changed:', cards.length, cards);

    if (cards.length === 0) {
      console.log('[GraphView] No cards, clearing circles');
      setCircles([]);
      return;
    }

    setCircles(prevCircles => {
      const newCircles: Circle[] = cards.map((card, index) => {
        const existingCircle = prevCircles.find(c => c.id === card.id);
        return {
          id: card.id,
          x: existingCircle?.x || card.x || Math.random() * (window.innerWidth - 200) + 100,
          y: existingCircle?.y || card.y || Math.random() * (window.innerHeight - 200) + 100,
          radius: 55,
          color: existingCircle?.color || COLORS[index % COLORS.length],
          name: card.title || '',
          value: 0,
          rank: 1,
          level: 0,
        };
      });
      console.log('[GraphView] newCircles created:', newCircles.length, newCircles);
      return newCircles;
    });
  }, [cards]);

  // circles 상태 변경 디버깅
  useEffect(() => {
    console.log('[GraphView] circles state changed:', circles.length, circles);
  }, [circles]);

  // relations를 Arrow로 변환 (선택된 관계 타입만 필터링)
  useEffect(() => {
    let filteredRelations = relations;
    // selectedRelationType이 있고, relationTypes가 있을 때만 필터링
    if (selectedRelationType && relationTypes.length > 0) {
      const relationType = relationTypes.find(rt => rt.typename === selectedRelationType);
      if (relationType) {
        filteredRelations = relations.filter(rel => rel.relationtype_id === relationType.relationtype_id);
      }
    }

    const newArrows: Arrow[] = filteredRelations.map((rel, index) => ({
      id: rel.relation_id || index,
      from: rel.source,
      to: rel.target,
    }));

    setArrows(newArrows);

    // arrows가 변경되면 노드값 재계산
    setCircles(prevCircles => {
      if (prevCircles.length > 0) {
        return calculateNodeValues(prevCircles, newArrows);
      }
      return prevCircles;
    });
  }, [relations, selectedRelationType, relationTypes]);

  // 초기 relation type 설정
  useEffect(() => {
    if (relationTypes.length > 0 && !selectedRelationType) {
      setSelectedRelationType(relationTypes[0].typename);
    }
  }, [relationTypes, selectedRelationType]);

  // 계층형 레이아웃 및 물리 엔진 (Layered Layout Strategy)
  useEffect(() => {
    if (circles.length === 0) return;
    if (draggedCircleId !== null) return; // 드래그 중에는 자동 배치 일시 중단

    let animationFrameId: number;
    const startY = 100; // 시작 여백
    const verticalSpacing = 150; // 수직 간격
    const horizontalSpacing = 200; // 수평 간격
    const springForce = 0.05; // Spring Force 계수 (Lerp 비율)
    const repulsionCoefficient = 1000; // 척력 계수
    const minDistance = 120; // 최소 안전 거리 (반지름 55 * 2 + 여유)

    const physicsStep = () => {
      setCircles(prevCircles => {
        if (prevCircles.length === 0) return prevCircles;
        if (draggedCircleId !== null) return prevCircles; // 드래그 중에는 업데이트 안 함

        // Rank별로 그룹화
        const rankGroups = new Map<number, Circle[]>();
        prevCircles.forEach(circle => {
          if (!rankGroups.has(circle.rank)) {
            rankGroups.set(circle.rank, []);
          }
          rankGroups.get(circle.rank)!.push(circle);
        });

        // 1. 목표 위치 계산 (Rank 기반 배치)
        const targetPositions = new Map<string, { targetX: number; targetY: number }>();
        
        rankGroups.forEach((groupCircles, rank) => {
          // 수직 배치: targetY = 시작_여백 + (rank * 수직_간격)
          const targetY = startY + (rank * verticalSpacing);
          
          // 수평 배치: 동일 rank 내에서 중앙 기준 분산
          groupCircles.forEach((circle, index) => {
            const totalNodes = groupCircles.length;
            // targetX = 화면_중앙 + (index - (해당_rank_총_노드수 - 1) / 2) * 수평_간격
            const targetX = (window.innerWidth / 2) + (index - (totalNodes - 1) / 2) * horizontalSpacing;
            targetPositions.set(circle.id, { targetX, targetY });
          });
        });

        // 2. Spring Force: 목표 지점으로 부드럽게 이동 (Lerp)
        let updated = prevCircles.map(circle => {
          if (circle.id === draggedCircleId) return circle; // 드래그 중인 노드는 제외
          
          const target = targetPositions.get(circle.id);
          if (!target) return circle;

          // Lerp를 사용한 부드러운 이동
          const dx = target.targetX - circle.x;
          const dy = target.targetY - circle.y;
          
          return {
            ...circle,
            x: circle.x + dx * springForce,
            y: circle.y + dy * springForce,
          };
        });

        // 3. Repulsion Force: 노드 간 척력
        for (let i = 0; i < updated.length; i++) {
          if (updated[i].id === draggedCircleId) continue; // 드래그 중인 노드는 제외
          
          let fx = 0;
          let fy = 0;

          for (let j = 0; j < updated.length; j++) {
            if (i === j) continue;
            if (updated[j].id === draggedCircleId) continue; // 드래그 중인 노드는 제외

            const dx = updated[j].x - updated[i].x;
            const dy = updated[j].y - updated[i].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0 && distance < minDistance) {
              // 힘의_세기 = (minDistance - d) / d * 척력_계수
              const force = (minDistance - distance) / distance * repulsionCoefficient;
              const normalizedDx = dx / distance;
              const normalizedDy = dy / distance;
              
              fx -= normalizedDx * force;
              fy -= normalizedDy * force;
            }
          }

          // 힘을 적용 (작은 스텝으로 부드럽게)
          updated[i] = {
            ...updated[i],
            x: updated[i].x + fx * 0.01,
            y: updated[i].y + fy * 0.01,
          };
        }

        return updated;
      });

      animationFrameId = requestAnimationFrame(physicsStep);
    };

    animationFrameId = requestAnimationFrame(physicsStep);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [circles.length, draggedCircleId]); // circles.length와 draggedCircleId가 변경될 때 재시작

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
  }, [circles, arrows, arrowMode]);

  // graph view.tsx의 핵심 함수들
  const handleDoubleClick = (circleId: string) => {
    const circle = circles.find((c) => c.id === circleId);
    if (!circle) return;

    setEditingCircleId(circleId);
    setEditingName(circle.name);
  };

  const handleNameChange = (value: string) => {
    setEditingName(value);
  };

  const handleNameSubmit = async () => {
    if (editingCircleId !== null) {
      const circle = circles.find(c => c.id === editingCircleId);
      if (circle && onUpdateCard) {
        await onUpdateCard(editingCircleId, 'title', editingName);
        setEditingCircleId(null);
        setEditingName('');
        if (onRefresh) await onRefresh();
      }
    }
  };

  const handleCircleClick = (circleId: string) => {
    if (!arrowMode) return;

    if (selectedCircleForArrow === null) {
      setSelectedCircleForArrow(circleId);
    } else {
      if (selectedCircleForArrow !== circleId) {
        const relationType = relationTypes.find(rt => rt.typename === selectedRelationType);
        if (relationType && onCreateRelation) {
          onCreateRelation(selectedCircleForArrow, circleId, relationType.relationtype_id).then(() => {
            if (onRefresh) onRefresh();
          });
        }
        setSelectedCircleForArrow(null);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent, circleId: string) => {
    if (isSpacePressed) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
      return;
    }

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
    if (isPanning) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      panStart.current = { x: e.clientX, y: e.clientY };
      return;
    }

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
    if (isPanning) {
      setIsPanning(false);
    }

    if (drawingArrow) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      const targetCircle = circles.find((circle) => {
        const dx = worldPos.x - circle.x;
        const dy = worldPos.y - circle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= circle.radius;
      });

      if (targetCircle && targetCircle.id !== drawingArrow.fromId) {
        const relationType = relationTypes.find(rt => rt.typename === selectedRelationType);
        if (relationType && onCreateRelation) {
          onCreateRelation(drawingArrow.fromId, targetCircle.id, relationType.relationtype_id).then(() => {
            if (onRefresh) onRefresh();
          });
        }
      }

      setDrawingArrow(null);
      return;
    }

    setDraggedCircleId(null);
  };

  const handleCircleRightClick = async (e: React.MouseEvent, circleId: string) => {
    e.preventDefault();

    if (onDeleteCard && window.confirm('이 카드를 삭제하시겠습니까?')) {
      await onDeleteCard(circleId);
      if (onRefresh) await onRefresh();
    }
  };

  const handleArrowRightClick = async (e: React.MouseEvent, arrowId: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (onDeleteRelation && window.confirm('이 관계를 삭제하시겠습니까?')) {
      await onDeleteRelation(arrowId);
      if (onRefresh) await onRefresh();
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (justFinishedDrawing.current) return;
    if (drawingArrow !== null || draggedCircleId !== null) return;
    if (!e.metaKey && !e.ctrlKey) return;

    const target = e.target as HTMLElement | SVGElement;
    const tagName = target.tagName?.toLowerCase();

    if (tagName === 'svg' || e.target === e.currentTarget) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      // Electron 환경에서는 prompt() 대신 간단한 입력 방식 사용
      const title = window.prompt ? window.prompt('카드 제목을 입력하세요:') : null;
      if (title && onCreateCard) {
        onCreateCard(title).then(() => {
          if (onRefresh) onRefresh();
        });
      }
    }
  };

  // 여백 더블클릭으로 새 노드(카드) 생성
  const handleBackgroundDoubleClick = async (e: React.MouseEvent) => {
    // 원이나 화살표를 더블클릭한 경우는 무시
    const target = e.target as HTMLElement | SVGElement;
    const tagName = target.tagName?.toLowerCase();
    
    // 원(motion.div)이나 화살표(line, path)를 클릭한 경우 무시
    if (tagName === 'div' || tagName === 'line' || tagName === 'path' || tagName === 'g') {
      // 원의 경우는 이미 handleDoubleClick에서 처리됨
      if (target.closest('[style*="borderRadius"]')) return;
      // 화살표의 경우도 무시
      if (target.closest('svg > g')) return;
    }

    // 배경 영역을 더블클릭한 경우에만 새 노드 생성
    if (tagName === 'svg' || e.target === e.currentTarget || (tagName === 'div' && !target.closest('[style*="borderRadius"]'))) {
      e.stopPropagation();
      const worldPos = screenToWorld(e.clientX, e.clientY);
      
      // 카드 제목 입력
      const title = window.prompt ? window.prompt('카드 제목을 입력하세요:') : null;
      if (!title) return;

      if (onCreateCard) {
        await onCreateCard(title);
        
        // 카드 생성 후 위치 업데이트
        // onRefresh를 통해 cards가 업데이트된 후, 새로 생성된 카드를 찾아 위치 설정
        if (onRefresh) {
          await onRefresh();
          
          // 새로 생성된 카드 찾기 (가장 최근에 생성된 카드)
          // cards 배열이 업데이트되면 가장 마지막 카드가 새로 생성된 카드일 가능성이 높음
          // 또는 카드 생성 API가 생성된 카드 ID를 반환하도록 수정 필요
          // 일단 간단하게 마지막 카드의 위치를 업데이트
          setTimeout(async () => {
            if (onRefresh) {
              await onRefresh();
              // cards 배열이 업데이트되면 circles도 자동으로 업데이트됨
              // 하지만 위치는 별도로 업데이트해야 함
              // onUpdateCard를 통해 x, y 필드를 업데이트
              // 하지만 카드 ID를 알 수 없으므로, 일단 이 부분은 나중에 개선
            }
          }, 200);
        }
      }
    }
  };

  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    if (isSpacePressed) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.2, Math.min(4, zoom * delta));

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
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

  // 스페이스바로 패닝 토글
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        setIsSpacePressed(true);
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const addCircle = async (x?: number, y?: number) => {
    // Electron 환경에서는 prompt() 대신 간단한 입력 방식 사용
    const title = window.prompt ? window.prompt('카드 제목을 입력하세요:') : null;
    if (!title) return;

    if (onCreateCard) {
      await onCreateCard(title);
      if (onRefresh) await onRefresh();
    }
    
    // 새로 생성된 카드의 위치를 설정 (x, y가 제공된 경우)
    // 카드가 생성되면 onRefresh가 호출되어 circles가 업데이트되므로
    // 위치는 카드 생성 후 별도로 업데이트해야 함
    if (x !== undefined && y !== undefined && onUpdateCard) {
      // 카드 생성 후 위치 업데이트는 onRefresh 콜백에서 처리
      // 또는 카드 생성 API가 위치를 받도록 수정 필요
    }
  };

  // 그래프 영역의 크기 계산 (circles의 위치를 기반으로)
  const graphBounds = circles.length > 0 ? circles.reduce((acc, circle) => {
    const minX = Math.min(acc.minX, circle.x - circle.radius);
    const maxX = Math.max(acc.maxX, circle.x + circle.radius);
    const minY = Math.min(acc.minY, circle.y - circle.radius);
    const maxY = Math.max(acc.maxY, circle.y + circle.radius);
    return { minX, maxX, minY, maxY };
  }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }) : null;

  const graphWidth = graphBounds ? Math.max(2000, graphBounds.maxX - graphBounds.minX + 400) : 2000;
  const graphHeight = graphBounds ? Math.max(2000, graphBounds.maxY - graphBounds.minY + 400) : 2000;
  const graphOffsetX = graphBounds ? Math.min(0, graphBounds.minX - 200) : 0;
  const graphOffsetY = graphBounds ? Math.min(0, graphBounds.minY - 200) : 0;
  const graphTransform = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: '0 0'
  };

    return (
    <div
            style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#000000', // 모노크롬 테마: 검정 배경
        transition: 'all 0.3s',
        cursor: isSpacePressed ? (isPanning ? 'grabbing' : 'grab') : (isPanning ? 'grabbing' : 'default')
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseDown={handleBackgroundMouseDown}
      onClick={handleBackgroundClick}
      onDoubleClick={handleBackgroundDoubleClick}
      onWheel={handleWheel}
    >
      {/* 스크롤 가능한 그래프 컨테이너 */}
      <div
            style={{
          position: 'relative',
          width: `${graphWidth}px`,
          height: `${graphHeight}px`,
          minWidth: '100%',
          minHeight: '100%'
        }}
      >
      {/* 디버깅 정보 (개발 모드) */}
      {process.env.NODE_ENV === 'development' && (
          <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'var(--text-primary)',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <div>Cards: {cards.length}</div>
          <div>Circles: {circles.length}</div>
          <div>Arrows: {arrows.length}</div>
          <div>Relations: {relations.length}</div>
          </div>
      )}

      {/* 빈 상태 메시지 */}
      {cards.length === 0 && (
      <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'var(--text-primary)',
          textAlign: 'center',
          zIndex: 10
        }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>📊</div>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>카드가 없습니다</div>
          <div style={{ fontSize: '14px', opacity: 0.7 }}>카드를 추가하면 그래프로 표시됩니다</div>
            </div>
      )}
      {/* SVG for arrows - positioned behind circles */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: `${graphWidth}px`, height: `${graphHeight}px`, zIndex: 1 }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
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
                stroke="rgba(255, 255, 255, 0.5)"
                strokeWidth="3"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1, delay: index * 0.1, ease: "easeInOut" }}
                pointerEvents="none"
              />
              <motion.path
                d={arrowhead}
                stroke="rgba(255, 255, 255, 0.5)"
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
              stroke="#fff"
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
      <div style={{ position: 'absolute', top: 0, left: 0, width: `${graphWidth}px`, height: `${graphHeight}px`, zIndex: 2, pointerEvents: 'none', ...graphTransform }}>
        {circles.filter(c => !isNaN(c.x) && !isNaN(c.y) && !isNaN(c.radius)).map((circle, index) => (
          <motion.div
            key={circle.id}
                style={{
                  position: 'absolute',
              left: circle.x - circle.radius,
              top: circle.y - circle.radius,
              width: circle.radius * 2,
              height: circle.radius * 2,
              borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
              backgroundColor: circle.color,
              pointerEvents: 'auto',
              border: '3px solid rgba(255, 255, 255, 0.4)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              cursor: arrowMode ? 'pointer' : 'grab',
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
              {editingCircleId === circle.id ? (
                  <input
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
                  style={{
                    width: '80px',
                    height: '32px',
                    textAlign: 'center',
                    fontSize: '14px',
                    padding: '4px',
                    backgroundColor: '#1e1e1e',
                    color: 'var(--text-primary)',
                    border: '1px solid #444',
                    borderRadius: '4px'
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span style={{ color: 'var(--text-primary)', opacity: 0.8, fontSize: '12px', fontFamily: 'monospace', letterSpacing: '0.1em', userSelect: 'none' }}>
                    #{circle.rank}
                  </span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '24px', fontWeight: 'bold', fontFamily: 'sans-serif', letterSpacing: '0.05em', userSelect: 'none' }}>
                    {circle.value}
                  </span>
                  {circle.name && (
                    <span style={{ color: 'var(--text-primary)', opacity: 0.9, fontSize: '12px', padding: '0 8px', textAlign: 'center', wordBreak: 'break-word', maxWidth: '100%', textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.08em', userSelect: 'none' }}>
                      {circle.name}
                    </span>
                  )}
                </>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      </div>
      {/* 스크롤 컨테이너 닫기 */}

      {/* Control panel */}
              <div
                style={{
                  position: 'fixed',
          top: '32px',
          left: controlPanelOpen ? '32px' : '-360px',
                  display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          zIndex: 1000,
          transition: 'all 0.35s ease'
                }}
              >
                <div
                  style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            padding: '20px',
            borderRadius: '24px',
            backgroundColor: '#2a2a2a',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.35), 0 10px 10px -5px rgba(0,0,0,0.25)',
            minWidth: '280px'
          }}
        >
          {/* 관계 타입 선택 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label htmlFor="relation-type-select" style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              관계 타입
            </label>
            <select
              id="relation-type-select"
              value={selectedRelationType}
              onChange={(e) => setSelectedRelationType(e.target.value)}
                    style={{
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                fontSize: '14px',
                background: '#1a1a1a',
                color: '#ffffff',
                letterSpacing: '0.05em'
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

          {/* 카드 추가 버튼 */}
                    <button
            onClick={() => addCircle()}
                      style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderRadius: '999px',
              padding: '20px',
              textTransform: 'uppercase',
              transition: 'all 0.3s',
              backgroundColor: '#6A6A6A',
              color: '#FFFFFF',
              border: '3px solid rgba(255, 255, 255, 0.4)',
              letterSpacing: '0.08em',
              fontWeight: 800,
                        cursor: 'pointer',
              fontSize: '14px'
                      }}
                    >
            <Plus size={18} />
            ADD CIRCLE
            <span style={{ fontSize: '12px', marginLeft: '4px', opacity: 0.6 }}>(⌘N)</span>
                    </button>

          {/* 화살표 모드 토글 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '999px', backgroundColor: '#4A4A4A', border: '3px solid rgba(255,255,255,0.3)' }}>
            <input
              type="checkbox"
              id="arrow-mode"
              checked={arrowMode}
              onChange={(e) => {
                setArrowMode(e.target.checked);
                setSelectedCircleForArrow(null);
              }}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <label
              htmlFor="arrow-mode"
                      style={{
                        cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textTransform: 'uppercase',
                color: '#FFFFFF',
                letterSpacing: '0.08em',
                fontWeight: 700
              }}
            >
              <GitBranch size={16} />
              <span>ARROW MODE</span>
              {arrowMode && (
                <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '999px', textTransform: 'uppercase', backgroundColor: '#FFFFFF', color: '#000000', fontWeight: 800 }}>
                  ON
                </span>
              )}
              <span style={{ fontSize: '12px', opacity: 0.6 }}>(⌘B)</span>
            </label>
          </div>

          {arrowMode && (
            <p style={{
              fontSize: '14px',
              padding: '14px',
              borderRadius: '999px',
              textTransform: 'uppercase',
              border: '3px solid rgba(255,255,255,0.3)',
              color: '#FFFFFF',
              backgroundColor: '#4A4A4A',
              letterSpacing: '0.08em',
              fontFamily: 'IBM Plex Mono, monospace',
              margin: 0,
              textAlign: 'center'
            }}>
              {selectedCircleForArrow === null
                ? 'SELECT FIRST CIRCLE'
                : 'SELECT SECOND CIRCLE'}
            </p>
        )}
      </div>
      </div>
      {/* Control panel toggle */}
      <button
        onClick={() => setControlPanelOpen(!controlPanelOpen)}
        style={{
          position: 'fixed',
          top: '32px',
          left: controlPanelOpen ? '340px' : '20px',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.4)',
          backgroundColor: '#6A6A6A',
          color: '#FFFFFF',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 20px rgba(0,0,0,0.25)',
          zIndex: 1001,
          transition: 'all 0.3s ease'
        }}
      >
        {controlPanelOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>

      {/* Circle Details Panel */}
      {focusedCircleId !== null && (() => {
        const selectedCircle = circles.find(c => c.id === focusedCircleId);
        if (!selectedCircle) return null;

        // 연결된 화살표 찾기
        const outgoingArrows = arrows.filter(a => a.from === focusedCircleId);
        const incomingArrows = arrows.filter(a => a.to === focusedCircleId);

        return (
          <div
            style={{
              position: 'fixed',
              top: '32px',
              right: detailPanelOpen ? '32px' : '-420px',
              width: '384px',
              zIndex: 1000,
              transition: 'all 0.35s ease'
            }}
          >
            <button
              onClick={() => setDetailPanelOpen(!detailPanelOpen)}
              style={{
                position: 'absolute',
                left: '-48px',
                top: '12px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.4)',
                backgroundColor: '#4A4A4A',
                color: '#FFFFFF',
                cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 20px rgba(0,0,0,0.25)'
              }}
            >
              {detailPanelOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            <div style={{
              backgroundColor: '#4A4A4A',
              border: '3px solid rgba(255,255,255,0.4)',
              borderRadius: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.35), 0 10px 10px -5px rgba(0, 0, 0, 0.25)'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '24px',
                padding: '24px',
                borderBottom: '1px solid rgba(255,255,255,0.3)'
              }}>
                <h3 style={{
                  fontSize: '24px',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  fontFamily: 'League Spartan, sans-serif',
                  letterSpacing: '0.1em',
                  fontWeight: 800,
                  margin: 0
                }}>CIRCLE DETAILS</h3>
              <button
                  onClick={() => setFocusedCircleId(null)}
                style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'transparent',
                  border: 'none',
                    color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s'
                }}
              >
                  <X size={20} />
              </button>
            </div>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                {/* ID */}
              <div>
                  <label style={{
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '12px',
                    letterSpacing: '0.1em',
                    display: 'block',
                    marginBottom: '8px'
                  }}>ID</label>
                <div style={{
                    fontSize: '20px',
                    color: 'var(--text-primary)',
                    fontFamily: 'monospace',
                    letterSpacing: '0.05em'
                  }}>#{selectedCircle.id}</div>
                  </div>

                {/* Name */}
              <div>
                  <label style={{
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '12px',
                    letterSpacing: '0.1em',
                    display: 'block',
                    marginBottom: '8px'
                  }}>NAME</label>
                  <input
                    value={selectedCircle.name}
                    onChange={(e) => {
                      setCircles(circles.map(c =>
                        c.id === focusedCircleId
                          ? { ...c, name: e.target.value }
                          : c
                      ));
                    }}
                    placeholder="ENTER NAME..."
                    style={{
                      width: '100%',
                      fontSize: '16px',
                      textTransform: 'uppercase',
                      backgroundColor: '#2A2A2A',
                      border: '2px solid rgba(255,255,255,0.3)',
                      color: '#FFFFFF',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      letterSpacing: '0.05em',
                      fontFamily: 'IBM Plex Mono, monospace'
                    }}
                  />
                  </div>

                {/* Content */}
                  <div>
                  <label style={{
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '12px',
                    letterSpacing: '0.1em',
                    display: 'block',
                    marginBottom: '8px'
                  }}>CONTENT</label>
                  <textarea
                    value={selectedCircle.content || ''}
                    onChange={(e) => {
                      setCircles(circles.map(c =>
                        c.id === focusedCircleId
                          ? { ...c, content: e.target.value }
                          : c
                      ));
                    }}
                    placeholder="ENTER CONTENT..."
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      backgroundColor: '#2A2A2A',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      letterSpacing: '0.05em',
                      fontFamily: 'IBM Plex Mono, monospace',
                      resize: 'vertical'
                    }}
                  />
                  </div>

                {/* Color */}
                <div>
                  <label style={{
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '12px',
                    letterSpacing: '0.1em',
                    display: 'block',
                    marginBottom: '8px'
                  }}>COLOR</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: selectedCircle.color,
                        border: '3px solid rgba(255,255,255,0.4)'
                      }}
                    />
                    <input
                      type="text"
                      value={selectedCircle.color}
                      onChange={(e) => {
                        setCircles(circles.map(c =>
                          c.id === focusedCircleId
                            ? { ...c, color: e.target.value }
                            : c
                        ));
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: '#2A2A2A',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        color: '#FFFFFF',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        letterSpacing: '0.05em',
                        fontFamily: 'IBM Plex Mono, monospace'
                      }}
                    />
                </div>
              </div>

                {/* Node Value */}
              <div>
                  <label style={{
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '12px',
                    letterSpacing: '0.1em',
                    display: 'block',
                    marginBottom: '8px'
                  }}>NODE VALUE</label>
                  <div style={{
                    fontSize: '32px',
                    color: '#FFFFFF',
                    fontFamily: 'League Spartan, sans-serif',
                    fontWeight: 800,
                    letterSpacing: '0.05em'
                  }}>{selectedCircle.value}</div>
                  <p style={{
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontFamily: 'IBM Plex Mono, monospace',
                    letterSpacing: '0.05em',
                    margin: '4px 0 0 0'
                  }}>
                    (CHILDREN COUNT + VALUES SUM)
                  </p>
                </div>

                {/* Rank */}
                <div>
                  <label style={{
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '12px',
                    letterSpacing: '0.1em',
                    display: 'block',
                    marginBottom: '8px'
                  }}>RANK</label>
                <div style={{
                    fontSize: '32px',
                    color: '#FFFFFF',
                    fontFamily: 'League Spartan, sans-serif',
                    fontWeight: 800,
                    letterSpacing: '0.05em'
                  }}>#{selectedCircle.rank}</div>
                  <p style={{
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontFamily: 'IBM Plex Mono, monospace',
                    letterSpacing: '0.05em',
                    margin: '4px 0 0 0'
                  }}>
                    GROUP RANKING
                  </p>
                </div>

                {/* Level */}
                <div>
                  <label style={{
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '12px',
                    letterSpacing: '0.1em',
                    display: 'block',
                    marginBottom: '8px'
                  }}>LEVEL</label>
                  <div style={{
                    fontSize: '32px',
                    color: '#FFFFFF',
                    fontFamily: 'League Spartan, sans-serif',
                    fontWeight: 800,
                    letterSpacing: '0.05em'
                  }}>{selectedCircle.level}</div>
                  <p style={{
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontFamily: 'IBM Plex Mono, monospace',
                    letterSpacing: '0.05em',
                    margin: '4px 0 0 0'
                  }}>
                    ARROW DEPTH
                  </p>
                </div>

                {/* Position */}
                <div>
                  <label style={{
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '12px',
                    letterSpacing: '0.1em',
                    display: 'block',
                    marginBottom: '8px'
                  }}>POSITION</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid #444',
                      backgroundColor: '#1e1e1e'
                    }}>
                      <span style={{
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        display: 'block',
                        color: 'rgba(255, 255, 255, 0.5)',
                        fontFamily: 'monospace',
                        letterSpacing: '0.05em',
                        marginBottom: '4px'
                      }}>X</span>
                      <span style={{
                        fontSize: '18px',
                        color: 'var(--text-primary)',
                        fontFamily: 'monospace'
                      }}>{Math.round(selectedCircle.x)}</span>
                          </div>
                    <div style={{
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid #444',
                      backgroundColor: '#1e1e1e'
                    }}>
                      <span style={{
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        display: 'block',
                        color: 'rgba(255, 255, 255, 0.5)',
                        fontFamily: 'monospace',
                        letterSpacing: '0.05em',
                        marginBottom: '4px'
                      }}>Y</span>
                      <span style={{
                        fontSize: '18px',
                        color: 'var(--text-primary)',
                        fontFamily: 'monospace'
                      }}>{Math.round(selectedCircle.y)}</span>
                          </div>
                </div>
              </div>

                {/* Connections */}
              <div>
                  <label style={{
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '12px',
                    letterSpacing: '0.1em',
                    display: 'block',
                    marginBottom: '8px'
                  }}>CONNECTIONS</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid #444',
                      backgroundColor: '#1e1e1e'
                    }}>
                    <span style={{
                        fontSize: '14px',
                        textTransform: 'uppercase',
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontFamily: 'monospace',
                        letterSpacing: '0.05em'
                      }}>OUTGOING</span>
                      <span style={{
                        fontSize: '18px',
                      color: 'var(--text-primary)',
                        fontFamily: 'sans-serif',
                        fontWeight: 700
                      }}>{outgoingArrows.length}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid #444',
                      backgroundColor: '#1e1e1e'
                    }}>
                      <span style={{
                        fontSize: '14px',
                        textTransform: 'uppercase',
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontFamily: 'monospace',
                        letterSpacing: '0.05em'
                      }}>INCOMING</span>
                      <span style={{
                        fontSize: '18px',
                        color: 'var(--text-primary)',
                        fontFamily: 'sans-serif',
                        fontWeight: 700
                      }}>{incomingArrows.length}</span>
                  </div>
                </div>
              </div>

                <div style={{ borderTop: '1px solid #444', paddingTop: '16px' }} />

                {/* Actions */}
              <div>
                  <button
                    style={{
                      width: '100%',
                      borderRadius: '999px',
                      padding: '24px',
                      textTransform: 'uppercase',
                      transition: 'all 0.3s',
                      backgroundColor: '#d4183d',
                      color: 'var(--text-primary)',
                      border: '1px solid #d4183d',
                      letterSpacing: '0.08em',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    onClick={async (e) => {
                      await handleCircleRightClick(e as any, focusedCircleId);
                      setFocusedCircleId(null);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    DELETE CIRCLE
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
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

  // 정렬 옵션 상태 (시각화용)
  const [sortOptions, setSortOptions] = useState({
    relationCount: {
      enabled: false,
      relationTypes: [] as string[],
      order: 'desc' as 'asc' | 'desc'
    },
    amount: {
      enabled: false,
      order: 'desc' as 'asc' | 'desc'
    }
  });

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
                      {sortOptions.relationCount.enabled ? (
                        sortOptions.relationCount.relationTypes.length > 0
                          ? `${sortOptions.relationCount.relationTypes.join(', ')}순`
                          : '전체관계순'
                      ) : '기본순'}
                    </span>
                  </h4>
                  {getSortedCards().filter(c => !c.complete).map(card => {
                    // 필터링 시스템의 보유관계순 설정을 사용
                    let relationCount = 0;

                    if (sortOptions.relationCount.enabled) {
                      if (sortOptions.relationCount.relationTypes.length > 0) {
                        // 선택된 관계타입들의 합계
                        sortOptions.relationCount.relationTypes.forEach(typeName => {
                          relationCount += getRelationCountByType(card.id, typeName);
                        });
                      } else {
                        // 모든 관계타입 합계
                        relationCount = getRelationCount(card.id);
                      }
                    } else {
                      // 보유관계순이 비활성화된 경우 전체 관계 개수
                      relationCount = getRelationCount(card.id);
                    }

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
                          color: 'var(--text-primary)',
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
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginLeft: 20 }}>
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
                      // 필터링 시스템의 보유관계순 설정을 사용
                      let relationCount = 0;

                      if (sortOptions.relationCount.enabled) {
                        if (sortOptions.relationCount.relationTypes.length > 0) {
                          // 선택된 관계타입들의 합계
                          sortOptions.relationCount.relationTypes.forEach(typeName => {
                            relationCount += getRelationCountByType(card.id, typeName);
                          });
                        } else {
                          // 모든 관계타입 합계
                          relationCount = getRelationCount(card.id);
                        }
                      } else {
                        // 보유관계순이 비활성화된 경우 전체 관계 개수
                        relationCount = getRelationCount(card.id);
                      }

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
                            background: 'var(--text-disabled)',
                            color: 'var(--text-primary)',
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
          <div style={{ flex: 1, height: '100%', minHeight: '400px', position: 'relative' }}>
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
          </div>
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
              <select
                className="editor-input"
                value={selectedCard.cardtype ?? ''}
                onChange={(e)=>{
                  const newId = e.target.value ? Number(e.target.value) : null;
                  if (newId !== null) {
                    updateCardField('cardtype', newId);
                  }
                }}
                style={{ flex: 1 }}
              >
                <option value="">선택</option>
                {cardTypes.map((ct) => (
                  <option key={ct.cardtype_id} value={ct.cardtype_id}>{ct.cardtype_name}</option>
                ))}
              </select>
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
            background: 'var(--panel)',
            color: 'var(--text-primary)',
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
              background: 'var(--bg-dark)',
              borderRadius: 8,
              border: '1px solid var(--border-dark)',
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
                  color: 'var(--text-muted)',
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
              <p style={{ color: 'var(--text-primary)', fontSize: 16, lineHeight: 1.5 }}>
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
                  <div style={{ color: 'var(--text-primary)', fontSize: 14 }}>
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
                  color: 'var(--text-primary)',
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
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0, lineHeight: 1.4 }}>
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
  const { language, setLanguage: setLanguageContext, t } = useContext(LanguageContext);
  const [settings, setSettings] = useState({
    confirmDelete: true,
    sleepStartTime: '23:00',
    sleepEndTime: '07:00',
    sleepDuration: '8시간',
    defaultCardType: 'todo',
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
  const [cardTypes, setCardTypes] = useState<any[]>([]);
  const [theme, setTheme] = useState<Theme>('black-gray-white');

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

  // 설정 및 카드타입 불러오기
  useEffect(() => {
    const loadData = async () => {
      // 설정 불러오기
    try {
      const savedSettings = localStorage.getItem('for-need-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.warn('설정 불러오기 실패:', error);
    }

      // 테마 설정 불러오기
      try {
        const result = await window.electron.ipcRenderer.invoke('get-settings');
        if (result.success && result.data?.theme) {
          const savedTheme = result.data.theme as Theme;
          setTheme(savedTheme);
          applyTheme(savedTheme);
        }
      } catch (error) {
        console.warn('테마 설정 불러오기 실패:', error);
      }

      // 카드타입 목록 불러오기
      try {
        const result = await window.electron.ipcRenderer.invoke('get-cardtypes');
        if (result.success) {
          setCardTypes(result.data);
        }
      } catch (error) {
        console.error('카드타입 로드 실패:', error);
      }
    };

    loadData();
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
      defaultCardType: 'todo',
      exportTemplate: `내보내기 일시: {currentDateTime}
수면 패턴: {sleepStartTime} ~ {sleepEndTime} ({sleepDuration})

아래 관계들을 검토하여 이 관계의 논리적 오류가 있는지 점검하고, 이를 기반으로 계획을 세워줘.

전체 관계 목록 (총 {relationCount}건)
{relationList}

시간정보가 있는 카드 목록{timeCardsCount}
{timeLegend}
{timeLines}`
    });
    showToast(t('settings.resetConfirm'));
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
          color: 'var(--text-primary)',
          padding: '12px 20px',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 1000,
          fontSize: 14
        }}>
          {toast}
        </div>
      )}

      <h2 style={{ marginTop: 0, marginBottom: 32, color: '#fff' }}>{t('settings.title')}</h2>

      {/* 테마 설정 섹션 */}
      <div style={{
        marginBottom: 32,
        padding: 20,
        background: 'var(--bg-dark)',
        borderRadius: 8,
        border: '1px solid #333'
      }}>
        <h3 style={{ margin: 0, marginBottom: 16, fontSize: 18, color: '#fff' }}>테마</h3>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#ccc' }}>
          테마 선택
        </label>
        <select
          value={theme}
          onChange={async (e) => {
            const newTheme = e.target.value as Theme;
            setTheme(newTheme);
            applyTheme(newTheme);
            
            // 테마 설정 저장
            try {
              await window.electron.ipcRenderer.invoke('save-settings', { theme: newTheme });
              showToast('테마가 변경되었습니다.');
            } catch (error) {
              console.error('테마 설정 저장 실패:', error);
              showToast('테마 저장에 실패했습니다.');
            }
          }}
          style={{
            width: '100%',
            padding: 12,
            background: 'var(--panel)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-dark)',
            borderRadius: 4,
            fontSize: 14,
            boxSizing: 'border-box'
          }}
        >
          <option value="brown">{themeNames.brown}</option>
          <option value="black-gray-white">{themeNames['black-gray-white']}</option>
          <option value="dark">{themeNames.dark}</option>
          <option value="light">{themeNames.light}</option>
        </select>
      </div>

      {/* 언어 설정 섹션 */}
      <div style={{
        marginBottom: 32,
        padding: 20,
        background: 'var(--bg-dark)',
        borderRadius: 8,
        border: '1px solid #333'
      }}>
        <h3 style={{ margin: 0, marginBottom: 16, fontSize: 18, color: '#fff' }}>{t('settings.language')}</h3>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#ccc' }}>
          {t('settings.language')}
        </label>
        <select
          value={language}
          onChange={(e) => {
            const newLang = e.target.value as Language;
            setLanguageContext(newLang);
            showToast(t('settings.saved'));
          }}
          style={{
            width: '100%',
            padding: 12,
            background: 'var(--panel)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-dark)',
            borderRadius: 4,
            fontSize: 14,
            boxSizing: 'border-box'
          }}
        >
          <option value="ko">{t('settings.language.ko')}</option>
          <option value="en">{t('settings.language.en')}</option>
        </select>
      </div>

      {/* DB 설정 섹션 */}
      <DatabaseSettings />

      {/* 카드 삭제 확인 설정 */}
      <div style={{
        marginBottom: 32,
        padding: 20,
        background: 'var(--bg-dark)',
        borderRadius: 8,
        border: '1px solid #333'
      }}>
        <h3 style={{ margin: 0, marginBottom: 16, fontSize: 18, color: '#fff' }}>{t('settings.cardDelete')}</h3>
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
          <span>{t('settings.cardDeleteConfirm')}</span>
        </label>
      </div>

      {/* 수면 패턴 설정 */}
      <div style={{
        marginBottom: 32,
        padding: 20,
        background: 'var(--bg-dark)',
        borderRadius: 8,
        border: '1px solid #333'
      }}>
        <h3 style={{ margin: 0, marginBottom: 16, fontSize: 18, color: '#fff' }}>{t('settings.sleepPattern')}</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#ccc' }}>
              {t('settings.sleepStart')}
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
                background: 'var(--panel)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-dark)',
                borderRadius: 4,
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#ccc' }}>
              {t('settings.sleepEnd')}
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
                background: 'var(--panel)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-dark)',
                borderRadius: 4,
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#ccc' }}>
              {t('settings.sleepDuration')}
            </label>
            <input
              type="text"
              value={settings.sleepDuration}
              onChange={(e) => setSettings(prev => ({ ...prev, sleepDuration: e.target.value }))}
              placeholder="예: 8시간, 7시간 30분"
              style={{
                width: '100%',
                padding: 12,
                background: 'var(--panel)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-dark)',
                borderRadius: 4,
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
          {t('settings.sleepAutoCalculate')}
        </p>
      </div>

      {/* 기본 카드타입 설정 */}
      <div style={{
        marginBottom: 32,
        padding: 20,
        background: 'var(--bg-dark)',
        borderRadius: 8,
        border: '1px solid #333'
      }}>
        <h3 style={{ margin: 0, marginBottom: 16, fontSize: 18, color: '#fff' }}>{t('settings.newCard')}</h3>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#ccc' }}>
          {t('settings.defaultCardType')}
        </label>
        <select
          value={settings.defaultCardType || 'todo'}
          onChange={(e) => setSettings(prev => ({ ...prev, defaultCardType: e.target.value }))}
          style={{
            width: '100%',
            padding: 12,
            background: 'var(--panel)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-dark)',
            borderRadius: 4,
            fontSize: 14,
            boxSizing: 'border-box'
          }}
        >
          {cardTypes.map((cardType) => (
            <option key={cardType.cardtype_id} value={cardType.cardtype_name}>
              {cardType.cardtype_name}
            </option>
          ))}
        </select>
        <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#888' }}>
          {t('settings.defaultCardTypeDesc')}
        </p>
      </div>

      {/* 내보내기 텍스트 템플릿 설정 */}
      <div style={{
        marginBottom: 32,
        padding: 20,
        background: 'var(--bg-dark)',
        borderRadius: 8,
        border: '1px solid #333'
      }}>
        <h3 style={{ margin: 0, marginBottom: 8, fontSize: 18, color: '#fff' }}>{t('settings.exportTemplate')}</h3>
        <p style={{ margin: 0, marginBottom: 16, fontSize: 14, color: '#888' }}>
          {t('settings.exportTemplateVariables')}
        </p>
        <textarea
          value={settings.exportTemplate}
          onChange={(e) => setSettings(prev => ({ ...prev, exportTemplate: e.target.value }))}
          style={{
            width: '100%',
            minHeight: 200,
            background: 'var(--panel)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-dark)',
            borderRadius: 4,
            padding: 12,
            fontSize: 14,
            fontFamily: 'monospace',
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
          placeholder={t('settings.exportTemplatePlaceholder')}
        />
      </div>

      {/* 액션 버튼들 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button
          onClick={resetToDefaults}
          style={{
            padding: '12px 24px',
            background: 'var(--text-disabled)',
            color: 'var(--text-primary)',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          {t('common.reset')}
        </button>
        <button
          onClick={() => showToast(t('settings.saved'))}
          style={{
            padding: '12px 24px',
            background: '#0066cc',
            color: 'var(--text-primary)',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          {t('common.save')}
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
          color: 'var(--text-primary)',
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
                  color: 'var(--text-primary)',
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
                  color: 'var(--text-primary)',
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
              background: 'var(--bg-dark)',
              borderRadius: 8,
              border: '1px solid var(--border)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#2a2a2a' }}>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>제목</th>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>카드타입</th>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>삭제일</th>
                    <th style={{ padding: 12, textAlign: 'center', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>작업</th>
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
                            color: 'var(--text-primary)',
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
                            color: 'var(--text-primary)',
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
                  color: 'var(--text-primary)',
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
                  color: 'var(--text-primary)',
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
              background: 'var(--bg-dark)',
              borderRadius: 8,
              border: '1px solid var(--border)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#2a2a2a' }}>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>소스</th>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>관계타입</th>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>대상</th>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>삭제일</th>
                    <th style={{ padding: 12, textAlign: 'center', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>작업</th>
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
                            color: 'var(--text-primary)',
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
                            color: 'var(--text-primary)',
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
                  color: 'var(--text-primary)',
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
                  color: 'var(--text-primary)',
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
              background: 'var(--bg-dark)',
              borderRadius: 8,
              border: '1px solid var(--border)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#2a2a2a' }}>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>이름</th>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>삭제일</th>
                    <th style={{ padding: 12, textAlign: 'center', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>작업</th>
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
                            color: 'var(--text-primary)',
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
                            color: 'var(--text-primary)',
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
                  color: 'var(--text-primary)',
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
                  color: 'var(--text-primary)',
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
              background: 'var(--bg-dark)',
              borderRadius: 8,
              border: '1px solid var(--border)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#2a2a2a' }}>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>이름</th>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>반대 관계</th>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>삭제일</th>
                    <th style={{ padding: 12, textAlign: 'center', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>작업</th>
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
                            color: 'var(--text-primary)',
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
                            color: 'var(--text-primary)',
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
          color: 'var(--text-primary)',
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
                background: 'var(--bg-dark)',
                border: '1px solid var(--border)',
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
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 16 }}>기능별 사용 빈도</h3>
            <div style={{
              background: 'var(--bg-dark)',
              borderRadius: 8,
              border: '1px solid var(--border)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#2a2a2a' }}>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>기능</th>
                    <th style={{ padding: 12, textAlign: 'center', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>총 사용</th>
                    <th style={{ padding: 12, textAlign: 'center', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>성공</th>
                    <th style={{ padding: 12, textAlign: 'center', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>에러</th>
                    <th style={{ padding: 12, textAlign: 'center', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>평균 시간</th>
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
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 16 }}>일별 활동 (최근 30일)</h3>
            <div style={{
              background: 'var(--bg-dark)',
              borderRadius: 8,
              border: '1px solid var(--border)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#2a2a2a' }}>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>날짜</th>
                    <th style={{ padding: 12, textAlign: 'center', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>총 액션</th>
                    <th style={{ padding: 12, textAlign: 'center', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>세션</th>
                    <th style={{ padding: 12, textAlign: 'center', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>카드 생성</th>
                    <th style={{ padding: 12, textAlign: 'center', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>관계 생성</th>
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
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 16 }}>시간대별 활동</h3>
            <div style={{
              background: 'var(--bg-dark)',
              borderRadius: 8,
              border: '1px solid var(--border)',
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
              <div style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-muted)', fontSize: 12 }}>
                시간 (0-23시)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 에러 분석 탭 */}
      {activeTab === 'errors' && (
        <div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 16 }}>에러 분석</h3>
          {errorAnalysis.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: 40 }}>
              에러가 발생하지 않았습니다.
            </p>
          ) : (
            <div style={{
              background: 'var(--bg-dark)',
              borderRadius: 8,
              border: '1px solid var(--border)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#2a2a2a' }}>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>기능</th>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>에러 메시지</th>
                    <th style={{ padding: 12, textAlign: 'center', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>발생 횟수</th>
                    <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>마지막 발생</th>
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
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 16 }}>세션 분석 (최근 50개)</h3>
          <div style={{
            background: 'var(--bg-dark)',
            borderRadius: 8,
            border: '1px solid var(--border)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#2a2a2a' }}>
                  <th style={{ padding: 12, textAlign: 'left', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>시작 시간</th>
                  <th style={{ padding: 12, textAlign: 'center', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>지속 시간</th>
                  <th style={{ padding: 12, textAlign: 'center', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>총 액션</th>
                  <th style={{ padding: 12, textAlign: 'center', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>카드 생성</th>
                  <th style={{ padding: 12, textAlign: 'center', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>관계 생성</th>
                  <th style={{ padding: 12, textAlign: 'center', color: 'var(--text-primary)', borderBottom: '1px solid #333' }}>에러</th>
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

  // 좌우 패널 검색 상태
  const [leftSearch, setLeftSearch] = useState('');
  const [rightSearch, setRightSearch] = useState('');

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
        background: 'var(--bg-dark)',
        padding: 20,
        borderRadius: 8,
        border: '1px solid var(--border)',
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
              border: '1px solid var(--border-dark)',
              background: '#2a2a2a',
              color: 'var(--text-primary)',
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
              border: '1px solid var(--border-dark)',
              background: '#2a2a2a',
              color: 'var(--text-primary)',
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
              border: '1px solid var(--border-dark)',
              background: '#2a2a2a',
              color: 'var(--text-primary)',
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
              color: 'var(--text-primary)',
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
        background: 'var(--bg-dark)',
        padding: 20,
        borderRadius: 8,
        border: '1px solid var(--border)',
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
              border: '1px solid var(--border-dark)',
              background: '#2a2a2a',
              color: 'var(--text-primary)',
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
              border: '1px solid var(--border-dark)',
              background: '#2a2a2a',
              color: 'var(--text-primary)',
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
              border: '1px solid var(--border-dark)',
              background: '#2a2a2a',
              color: 'var(--text-primary)',
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
              color: 'var(--text-primary)',
              border: '1px solid var(--border-dark)',
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
              background: 'var(--text-disabled)',
              color: 'var(--text-primary)',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            초기화
          </button>
        </div>
      </div>

      {/* 좌우 패널 관계 목록 */}
      <div style={{ display: 'flex', gap: 16, height: '60vh' }}>
        {/* 좌측 패널: Source 기준 */}
        <div style={{ flex: 1, background: 'var(--bg-dark)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: '1px solid #333', background: '#2a2a2a' }}>
            <h3 style={{ margin: 0, marginBottom: 12, color: 'var(--text-primary)', fontSize: 16 }}>Source 기준 관계</h3>
            <input
              type="text"
              placeholder="Source 카드 검색..."
              value={leftSearch}
              onChange={(e) => setLeftSearch(e.target.value)}
                        style={{
                width: '100%',
                padding: 8,
                background: 'var(--panel)',
                          color: 'var(--text-primary)',
                border: '1px solid var(--border-dark)',
                          borderRadius: 4,
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ height: 'calc(100% - 80px)', overflowY: 'auto', padding: 8 }}>
            {relations
              .filter(rel => !leftSearch || (rel.source_title || '').toLowerCase().includes(leftSearch.toLowerCase()))
              .map((rel: any) => (
                <div key={`left-${rel.relation_id}`} style={{
                  padding: 12,
                  margin: '4px 0',
                  background: '#2a2a2a',
                  borderRadius: 6,
                  border: '1px solid #333'
                }}>
                  <div style={{ color: '#0066cc', fontWeight: 'bold', marginBottom: 4 }}>
                    {rel.source_title || rel.source}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>
                    {rel.typename}
                  </div>
                  <div style={{ color: 'var(--text-primary)', marginBottom: 8 }}>
                    → {rel.target_title || rel.target}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                      <button
                      onClick={() => del(rel.relation_id)}
                        style={{
                        padding: '4px 8px',
                          background: '#dc3545',
                          color: 'var(--text-primary)',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                        fontSize: 11
                        }}
                      >
                        삭제
                      </button>
                    </div>
                </div>
              ))}
      </div>
      </div>

        {/* 세로 구분선 */}
        <div style={{ width: 2, background: '#333' }}></div>

        {/* 우측 패널: Source 기준 (다른 뷰) */}
        <div style={{ flex: 1, background: 'var(--bg-dark)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: '1px solid #333', background: '#2a2a2a' }}>
            <h3 style={{ margin: 0, marginBottom: 12, color: 'var(--text-primary)', fontSize: 16 }}>Source 기준 관계 (우측)</h3>
            <input
              type="text"
              placeholder="Source 카드 검색..."
              value={rightSearch}
              onChange={(e) => setRightSearch(e.target.value)}
                style={{
                  width: '100%',
                padding: 8,
                background: 'var(--panel)',
                color: 'var(--text-primary)',
                  border: '1px solid var(--border-dark)',
                borderRadius: 4,
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
            </div>
          <div style={{ height: 'calc(100% - 80px)', overflowY: 'auto', padding: 8 }}>
            {relations
              .filter(rel => !rightSearch || (rel.source_title || '').toLowerCase().includes(rightSearch.toLowerCase()))
              .map((rel: any) => (
                <div key={`right-${rel.relation_id}`} style={{
                  padding: 12,
                  margin: '4px 0',
                  background: '#2a2a2a',
                  borderRadius: 6,
                  border: '1px solid #333'
                }}>
                  <div style={{ color: '#ff6b6b', fontWeight: 'bold', marginBottom: 4 }}>
                    {rel.source_title || rel.source}
            </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>
                    {rel.typename}
            </div>
                  <div style={{ color: 'var(--text-primary)', marginBottom: 8 }}>
                    → {rel.target_title || rel.target}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
              <button
                      onClick={() => del(rel.relation_id)}
                style={{
                        padding: '4px 8px',
                        background: '#dc3545',
                  color: 'var(--text-primary)',
                  border: 'none',
                        borderRadius: 4,
                  cursor: 'pointer',
                        fontSize: 11
                }}
              >
                      삭제
              </button>
            </div>
          </div>
              ))}
        </div>
        </div>
      </div>
      </div>
    </div>
  );
}

// 언어 Context
const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}>({
  language: 'ko',
  setLanguage: () => {},
  t: (key: string) => key,
});

export default function App() {
  const [language, setLanguageState] = useState<Language>('ko');
  const [languageInitialized, setLanguageInitialized] = useState(false);

  // 언어 초기화
  useEffect(() => {
    const initializeLanguage = async () => {
      await initLanguage();
      setLanguageState(getLanguage());
      setLanguageInitialized(true);
    };
    initializeLanguage();
  }, []);

  // 테마 초기화
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        const result = await window.electron.ipcRenderer.invoke('get-settings');
        if (result.success && result.data?.theme) {
          const savedTheme = result.data.theme as Theme;
          applyTheme(savedTheme);
        } else {
          // 기본 테마 적용
          applyTheme('black-gray-white');
        }
      } catch (error) {
        console.warn('테마 초기화 실패:', error);
        // 기본 테마 적용
        applyTheme('black-gray-white');
      }
    };
    initializeTheme();
  }, []);

  // 언어 변경 핸들러
  const handleLanguageChange = async (lang: Language) => {
    setLanguage(lang);
    setLanguageState(lang);
    // IPC로 설정 저장
    try {
      await window.electron.ipcRenderer.invoke('save-settings', { language: lang });
    } catch (error) {
      console.error('Failed to save language setting:', error);
    }
  };

  if (!languageInitialized) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading...</div>;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleLanguageChange, t }}>
      <Router>
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <nav style={{ padding: 12, background: '#222', flexShrink: 0 }}>
          {[
            { to: '/', label: t('home.title') },
            { to: '/visualization', label: '시각화' },
            { to: '/schedule-budget', label: '일정 & 예산' },
            { to: '/cardtypes', label: '카드타입' },
            { to: '/relationtypes', label: '관계타입' },
            { to: '/relations', label: '관계' },
              { to: '/projects', label: t('project.title') },
            { to: '/trash', label: '휴지통' },
            { to: '/analytics', label: '분석' },
            { to: '/settings', label: t('common.settings') },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => {
                // 페이지 방문 로깅
                window.electron.ipcRenderer.invoke('log-page-visit', item.to.substring(1) || 'home');
              }}
              style={{ color: 'var(--text-primary)', marginRight: 16, textDecoration: 'none' }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ flex: 1, overflow: 'hidden' }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/visualization" element={<Visualization />} />
        <Route path="/schedule-budget" element={<ScheduleAndBudget />} />
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
    </LanguageContext.Provider>
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

  // 텍스트 입력 모드 상태
  const [useTextInput, setUseTextInput] = useState(false);
  const [sourceCardText, setSourceCardText] = useState('');
  const [targetCardText, setTargetCardText] = useState('');

  const relationTypeOptions = [
    { id: 1, name: 'for' },
    { id: 2, name: 'need' },
    { id: 3, name: 'before' },
    { id: 4, name: 'after' },
  ];

  const handleSubmit = async () => {
    console.log('🔄 [RelationForm] handleSubmit 시작');
    // 텍스트 입력 모드와 셀렉트 모드에 따라 다른 값 사용
    const sourceValue = useTextInput ? sourceCardText.trim() : sourceCard;
    const targetValue = useTextInput ? targetCardText.trim() : targetCard;

    console.log('📝 [RelationForm] 입력값:', {
      useTextInput,
      sourceValue,
      targetValue,
      sourceCardText,
      targetCardText,
      sourceCard,
      targetCard
    });

    if (!sourceValue || !targetValue) {
      console.log('❌ [RelationForm] 빈 값으로 인해 중단');
      return;
    }

    let srcId = sourceValue;
    let tgtId = targetValue;

    // 소스 카드가 존재하지 않으면 새로 생성
    const srcFound = cards.find(c => c.id === sourceValue || c.title === sourceValue);
    if (!srcFound) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = (await window.electron.ipcRenderer.invoke('create-card', { title: sourceValue })) as any;
      if (res.success) {
        srcId = res.data.id;
        if (!useTextInput) setSourceCard(srcId); // 셀렉트가 비워지지 않도록 갱신
      } else if (res.error === 'duplicate-title') {
        const dup = cards.find(c => c.title === sourceValue);
        if (dup) srcId = dup.id;
      }
    } else {
      srcId = srcFound.id;
    }

    // 타겟 카드가 존재하지 않으면 새로 생성 (기존 로직과 동일하게 빈칸 유지)
    const tgtFound = cards.find(c => c.id === targetValue || c.title === targetValue);
    if (!tgtFound) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = (await window.electron.ipcRenderer.invoke('create-card', { title: targetValue })) as any;
      if (res.success) {
        tgtId = res.data.id;
      } else if (res.error === 'duplicate-title') {
        const dup = cards.find(c => c.title === targetValue);
        if (dup) tgtId = dup.id;
      }
    } else {
      tgtId = tgtFound.id;
    }

    // Source와 Target이 같은 경우 방지
    if (srcId === tgtId) {
      console.log('❌ [RelationForm] 같은 카드로 관계 생성 시도');
      alert('자기 자신과의 관계는 만들 수 없습니다');
      return;
    }

    console.log('🔗 [RelationForm] 관계 생성 시도:', {
      relationtype_id: Number(relationType),
      source: srcId,
      target: tgtId
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await window.electron.ipcRenderer.invoke(
      'create-relation',
      {
        relationtype_id: Number(relationType),
        source: srcId,
        target: tgtId,
      },
    )) as any;

    console.log('📊 [RelationForm] 관계 생성 결과:', result);

    if (result.success) {
      console.log('✅ [RelationForm] 관계 생성 성공!');
      // SourceCard 유지, TargetCard 초기화
      if (useTextInput) {
        setTargetCardText('');
      } else {
      setTargetCard('');
      }
      refreshCards();
    } else {
      console.log('❌ [RelationForm] 관계 생성 실패:', result.error);
      alert(`관계 생성 실패: ${result.error || '알 수 없는 오류'}`);
    }
  };

  // Enter 키 핸들러
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      console.log('⌨️ [RelationForm] Enter 키 감지');
      e.preventDefault();
      handleSubmit();
    }
  };

  // Source 필드 전용 Enter 키 핸들러 (카드 생성만)
  const handleSourceKeyPress = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      console.log('⌨️ [RelationForm] Source Enter 키 감지');
      e.preventDefault();

      const sourceValue = sourceCardText.trim();
      if (!sourceValue) {
        console.log('❌ [RelationForm] Source 값이 비어있음');
        return;
      }

      // Target이 비어있으면 카드만 생성
      if (!targetCardText.trim()) {
        console.log('🎯 [RelationForm] Target이 비어있어서 카드만 생성');

        // 이미 존재하는 카드인지 확인
        const srcFound = cards.find(c => c.title === sourceValue);
        if (srcFound) {
          console.log('ℹ️ [RelationForm] 이미 존재하는 카드:', srcFound.title);
          setSourceCardText(''); // 입력 필드 초기화
          return;
        }

        try {
          // 기본 카드타입 가져오기
          const getDefaultCardType = () => {
            try {
              const savedSettings = localStorage.getItem('for-need-settings');
              if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                return parsed.defaultCardType || 'todo';
              }
            } catch (error) {
              console.warn('설정 불러오기 실패:', error);
            }
            return 'todo';
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const res = (await window.electron.ipcRenderer.invoke('create-card', {
            title: sourceValue,
            cardtype: getDefaultCardType()
          })) as any;

          if (res.success) {
            console.log('✅ [RelationForm] 카드 생성 성공!');
            setSourceCardText(''); // 입력 필드 초기화
            refreshCards(); // 카드 목록 새로고침
          } else {
            console.log('❌ [RelationForm] 카드 생성 실패:', res.error);
            if (res.error === 'duplicate-title') {
              console.log('ℹ️ [RelationForm] 중복 제목으로 인한 실패');
              setSourceCardText(''); // 입력 필드 초기화
            }
          }
        } catch (error) {
          console.error('❌ [RelationForm] 카드 생성 중 오류:', error);
        }
      } else {
        // Target이 있으면 관계 생성
        console.log('🔗 [RelationForm] Target이 있어서 관계 생성');
        handleSubmit();
      }
    }
  };

  return (
    <div>
      <h3>New Relation</h3>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
          <input
            type="checkbox"
            checked={useTextInput}
            onChange={(e) => setUseTextInput(e.target.checked)}
          />
          <span>텍스트 입력 모드 (Enter로 관계 생성)</span>
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {useTextInput ? (
          <>
            {/* 텍스트 입력 모드 */}
            <input
              type="text"
              placeholder="Source Card 이름 입력"
              value={sourceCardText}
              onChange={(e) => setSourceCardText(e.target.value)}
              onKeyPress={handleSourceKeyPress}
              style={{
                flex: '1 0 150px',
                padding: '8px',
                backgroundColor: '#333',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-dark)',
                borderRadius: '4px'
              }}
            />
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
            <input
              type="text"
              placeholder="Target Card 이름 입력"
              value={targetCardText}
              onChange={(e) => setTargetCardText(e.target.value)}
              onKeyPress={handleKeyPress}
              style={{
                flex: '1 0 150px',
                padding: '8px',
                backgroundColor: '#333',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-dark)',
                borderRadius: '4px'
              }}
            />
          </>
        ) : (
          <>
            {/* 셀렉트 박스 모드 */}
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
          </>
        )}
        <button type="button" onClick={handleSubmit}>
          {useTextInput ? '생성 (Enter)' : 'Save'}
        </button>
      </div>
    </div>
  );
}
