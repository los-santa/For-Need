import React, { useEffect, useState } from 'react';
import { MemoryRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';

interface Project {
  project_id: string;
  project_name: string;
  createdat: string;
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
          <li key={c.id}>
            {c.title} <span style={{ color: '#888' }}>({c.id})</span>
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
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [relations, setRelations] = useState<{
    relation_id: number;
    relationtype_id: number;
    typename: string;
    target: string;
    target_title: string | null;
  }[]>([]);
  const [cardTypes, setCardTypes] = useState<{ cardtype_id: string; cardtype_name: string }[]>([]);
  const [relationTypes, setRelationTypes] = useState<{ relationtype_id: number; typename: string }[]>([]);
  const [toast, setToast] = useState('');
  const [cardTypeInput, setCardTypeInput] = useState('');
  const [cardTitleInput, setCardTitleInput] = useState('');

  const loadCards = async () => {
    const res = (await window.electron.ipcRenderer.invoke('get-cards')) as any;
    if (res.success) {
      setCards(res.data as { id: string; title: string; cardtype?: string | null }[]);
      if (!selectedCard && res.data.length) setSelectedCard(res.data[0].id);
    }
  };

  const loadRelations = async (cardId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = (await window.electron.ipcRenderer.invoke('get-relations-by-source', cardId)) as any;
    if (res.success) {
      setRelations(res.data);
    }
  };

  useEffect(() => {
    loadCards();
    // load cardtypes & relationtypes once
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ct = (await window.electron.ipcRenderer.invoke('get-cardtypes')) as any;
      if (ct.success) setCardTypes(ct.data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rt = (await window.electron.ipcRenderer.invoke('get-relationtypes')) as any;
      if (rt.success) setRelationTypes(rt.data);
    })();
  }, []);

  useEffect(() => {
    if (selectedCard) loadRelations(selectedCard);
  }, [selectedCard]);

  useEffect(() => {
    const card = cards.find((c) => c.id === selectedCard);
    if (card) {
      setCardTitleInput(card.title);
      const name = cardTypes.find((ct) => ct.cardtype_id === card.cardtype)?.cardtype_name || '';
      setCardTypeInput(name);
    } else {
      setCardTitleInput('');
      setCardTypeInput('');
    }
  }, [selectedCard, cards, cardTypes]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // 카드타입 입력 Enter 처리
  const handleCardTypeEnter = async () => {
    const name = cardTypeInput.trim();
    if (!name) return;
    let targetId = '';
    const exists = cardTypes.find((ct) => ct.cardtype_name === name);
    if (exists) {
      targetId = exists.cardtype_id;
    } else {
      const res = (await window.electron.ipcRenderer.invoke('create-cardtype', { name })) as any;
      if (res.success) {
        targetId = res.data.id;
        const ct = (await window.electron.ipcRenderer.invoke('get-cardtypes')) as any;
        if (ct.success) setCardTypes(ct.data);
      }
    }
    if (targetId) {
      await window.electron.ipcRenderer.invoke('update-cardtype', { card_id: selectedCard, cardtype: targetId });
      await loadCards();
      showToast(`${cards.find((c) => c.id === selectedCard)?.title} 카드의 카드타입을 ${name} 으로 변경 완료`);
    }
  };

  // 선택 카드 제목 변경 (버튼)
  const editTitle = async () => {
    const current = cards.find((c) => c.id === selectedCard);
    if (!current) return;
    const newTitle = cardTitleInput.trim();
    if (!newTitle || newTitle === current.title) return;
    // 제목 중복 검사
    const dup = cards.find((c) => c.title === newTitle && c.id !== selectedCard);
    if (dup) {
      showToast('같은 제목의 카드가 이미 존재합니다');
      return;
    }
    const res = (await window.electron.ipcRenderer.invoke('update-card-title', {
      card_id: selectedCard,
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
    // ------------------------------------------------
    // source card 확보 (제목 입력칸 기준)
    // ------------------------------------------------
    const sourceTitle = cardTitleInput.trim();
    if (!sourceTitle) {
      showToast('먼저 카드 제목을 입력하세요');
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
        await loadCards();
      } else if (created.error === 'duplicate-title') {
        // theoretically not reached due to earlier search but safe guard
        const dup = (cards.find((c)=>c.title===sourceTitle) || {}) as any;
        sourceId = dup.id;
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
      // 반대 관계명은 입력란을 제거했으므로 자동 생성
      const oppositeName = relationTypeInput + '_rev';
      const res = (await window.electron.ipcRenderer.invoke('create-relationtype', {
        typename: relationTypeInput,
        oppsite: oppositeName,
      })) as any;
      if (res.success) {
        relationTypeId = res.data.id;
        const rt = (await window.electron.ipcRenderer.invoke('get-relationtypes')) as any;
        if (rt.success) setRelationTypes(rt.data);
      }
    }

    // target card id 확보
    const targetCardInput = (document.getElementById('targetCardInput') as HTMLInputElement).value.trim();
    let targetId: string | undefined;
    const cardExists = cards.find((c) => c.title === targetCardInput || c.id === targetCardInput);
    if (cardExists) {
      targetId = cardExists.id;
    } else {
      const res = (await window.electron.ipcRenderer.invoke('create-card', { title: targetCardInput })) as any;
      if (res.success) {
        targetId = res.data.id;
        await loadCards();
      }
    }

    if (relationTypeId && targetId) {
      const res = (await window.electron.ipcRenderer.invoke('create-relation', {
        relationtype_id: relationTypeId,
        source: sourceId,
        target: targetId,
      })) as any;
      if (res.success) {
        (document.getElementById('relationTypeInput') as HTMLInputElement).value = '';
        (document.getElementById('targetCardInput') as HTMLInputElement).value = '';
        await loadRelations(sourceId);
        showToast('관계 생성 완료');
      }
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* 좌측 카드 리스트 */}
      <aside style={{ width: 250, borderRight: '1px solid #ccc', overflowY: 'auto' }}>
        <h3 style={{ padding: 12, margin: 0 }}>Cards</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {cards.map((c) => (
            <li
              key={c.id}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                background: selectedCard === c.id ? '#eee' : 'transparent',
              }}
              onClick={() => setSelectedCard(c.id)}
            >
              {c.title}
            </li>
          ))}
        </ul>
      </aside>

      {/* 중앙 편집기 */}
      <section className="editor">
        <h3>카드 편집</h3>
        {/* 카드 제목 (읽기) + 수정 버튼 */}
        <div className="editor-row">
          <input
            type="text"
            value={cardTitleInput}
            onChange={(e)=>setCardTitleInput(e.target.value)}
            onKeyDown={async (e)=>{
              if(e.key==='Enter'){
                const title = cardTitleInput.trim();
                if(!title) return;
                const exist = cards.find(c=>c.title===title);
                if(exist){
                  setSelectedCard(exist.id);
                }else{
                  const res = (await window.electron.ipcRenderer.invoke('create-card', {title})) as any;
                  if(res.success){
                    await loadCards();
                    setSelectedCard(res.data.id);
                    showToast('새 카드 생성 및 선택 완료');
                  } else if(res.error==='duplicate-title'){
                    showToast('동일한 제목의 카드가 이미 존재합니다');
                  }
                }
              }
            }}
            placeholder="카드 제목 입력 후 Enter"
            className="editor-input"
          />
          <button type="button" onClick={editTitle} className="editor-button">제목수정</button>
        </div>

        {/* 카드 타입 (입력) */}
        <div className="editor-row">
          <input
            id="cardTypeInput"
            list="cardTypeOptions"
            value={cardTypeInput}
            onChange={(e) => setCardTypeInput(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                await handleCardTypeEnter();
              }
            }}
            className="editor-input"
            placeholder="카드 타입"
          />
          <datalist id="cardTypeOptions">
            {cardTypes.map((ct) => (
              <option key={ct.cardtype_id} value={ct.cardtype_name} />
            ))}
          </datalist>
        </div>

        {/* 관계 생성 영역 */}
        <div className="editor-row">
          <input
            list="relationTypeOptions"
            placeholder="관계타입"
            className="editor-input"
            id="relationTypeInput"
          />
          <input
            list="cardOptions"
            placeholder="대상 카드 제목"
            className="editor-input"
            id="targetCardInput"
            onKeyDown={(e)=>{
              if(e.key==='Enter'){
                handleCreateRelation();
              }
            }}
          />
          <button
            type="button"
            onClick={handleCreateRelation}
            className="editor-button"
          >
            관계추가
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
        <div>
          <h4 className="editor-section-title">현재 관계</h4>
          {relations.length === 0 ? (
            <p style={{ color: '#888' }}>관계가 없습니다.</p>
          ) : (
            <ul style={{ paddingLeft: 16 }}>
              {relations.map((r) => (
                <li
                  key={r.relation_id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedCard(r.target)}
                >
                  {r.typename} ➜ {r.target_title ?? r.target}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 우측 카드 세부사항 */}
      <aside style={{ width: 300, borderLeft: '1px solid #ccc', overflowY: 'auto', padding: 20 }}>
        <h3>카드 세부사항</h3>
        {selectedCard ? (
          <div>
            <p><strong>ID:</strong> {selectedCard}</p>
            <p>
              <strong>제목:</strong>{' '}
              {cards.find((c) => c.id === selectedCard)?.title ?? ''}
            </p>
            <hr />
            {/* 관계 목록은 중앙 편집기로 이동 */}
            <hr />
          </div>
        ) : (
          <p>카드를 선택하세요.</p>
        )}
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

function CardTypeManage() {
  return <h2>카드타입 관리 (준비중)</h2>;
}

function RelationTypeManage() {
  return <h2>관계타입 관리 (준비중)</h2>;
}

function RelationManage() {
  return <h2>관계 관리 (준비중)</h2>;
}

export default function App() {
  return (
    <Router>
      <nav style={{ padding: 12, background: '#222' }}>
        {[
          { to: '/', label: '홈' },
          { to: '/projects', label: '프로젝트' },
          { to: '/cards', label: '카드' },
          { to: '/cardtypes', label: '카드타입' },
          { to: '/relationtypes', label: '관계타입' },
          { to: '/relations', label: '관계' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            style={{ color: '#fff', marginRight: 16, textDecoration: 'none' }}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<Projects />} />
        <Route
          path="/cards"
          element={<CardsManage cards={[]} refreshCards={() => {}} />}
        />
        <Route path="/cardtypes" element={<CardTypeManage />} />
        <Route path="/relationtypes" element={<RelationTypeManage />} />
        <Route path="/relations" element={<RelationManage />} />
      </Routes>
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await window.electron.ipcRenderer.invoke(
      'create-relation',
      {
        relationtype_id: Number(relationType),
        source: sourceCard,
        target: targetCard,
      },
    )) as any;

    if (result.success) {
      setSourceCard('');
      setTargetCard('');
      // 성공 후 카드 목록 갱신
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
