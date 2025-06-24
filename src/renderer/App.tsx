import React, { useEffect, useState } from 'react';
import { MemoryRouter as Router, Routes, Route, Link } from 'react-router-dom';
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
  const [oppRelationInput, setOppRelationInput] = useState('');
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [modalCardId, setModalCardId] = useState('');
  const [modalNewTitle, setModalNewTitle] = useState('');
  const [projects,setProjects]=useState<{project_id:string; project_name:string}[]>([]);
  const [cardDetail,setCardDetail]=useState<any|null>(null);

  const loadCards = async () => {
    const res = (await window.electron.ipcRenderer.invoke('get-cards')) as any;
    if (res.success) {
      setCards(res.data as { id: string; title: string; cardtype?: string | null }[]);
      if (!currentCardId && res.data.length) {
        // nothing
      }
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
      const pj = (await window.electron.ipcRenderer.invoke('get-projects')) as any;
      if(pj.success) setProjects(pj.data);
    })();
  }, []);

  useEffect(()=>{
    const card = cards.find(c=>c.title===cardTitleInput.trim());
    if(card){
      setCurrentCardId(card.id);
      loadRelations(card.id);
      loadCardDetail(card.id);
    } else {
      setCurrentCardId('');
      setRelations([]);
      setCardDetail(null);
    }
  },[cardTitleInput,cards]);

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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

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
      if(!oppRelationInput.trim()) {showToast('반대 관계명을 입력하세요'); return;}
      const res = (await window.electron.ipcRenderer.invoke('create-relationtype', {
        typename: relationTypeInput,
        oppsite: oppRelationInput.trim(),
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
        // relationTypeInput 유지
        (document.getElementById('targetCardInput') as HTMLInputElement).value = '';
        setOppRelationInput('');
        await loadRelations(sourceId);
        showToast('관계 생성 완료');
      }
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
    setCardDetail((prev:any)=>({...prev,[field]:value}));
    await window.electron.ipcRenderer.invoke('update-card-field',{card_id:currentCardId,field,value});

    if(field==='title'){
      setCardTitleInput(value as string);
      // 로컬 cards 상태 업데이트
      setCards(prev=>prev.map(c=>c.id===currentCardId?{...c,title:value}:c));
    }

    if(field==='cardtype'){
      setCards(prev=>prev.map(c=>c.id===currentCardId?{...c,cardtype:value}:c));
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
                background: (cardTitleInput.trim()!=='' && cardTitleInput.trim()===c.title) ? '#444' : 'transparent',
              }}
              onClick={() => setCardTitleInput(c.title)}
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
                  setCurrentCardId(exist.id);
                }else{
                  const res = (await window.electron.ipcRenderer.invoke('create-card', {title})) as any;
                  if(res.success){
                    await loadCards();
                    setCurrentCardId(res.data.id);
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
          <button type="button" onClick={()=>{if(currentCardId){setModalCardId(currentCardId); setModalNewTitle(cardTitleInput);} setShowTitleModal(true);}} className="editor-button" tabIndex={-1}>제목수정</button>
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
            tabIndex={-1}
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
                  style={{ display:'flex', alignItems:'center', gap:8 }}
                >
                  <span style={{ cursor:'pointer' }} onClick={() => setCardTitleInput(r.target_title ?? r.target)}>
                    {r.typename} ➜ {r.target_title ?? r.target}
                  </span>
                  <button
                    style={{ padding:'2px 6px' }}
                    onClick={async(e)=>{
                      e.stopPropagation();
                      await window.electron.ipcRenderer.invoke('delete-relation', r.relation_id);
                      loadRelations(currentCardId);
                    }}
                  >삭제</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 우측 카드 세부사항 */}
      <aside style={{ width: 300, borderLeft: '1px solid #ccc', overflowY: 'auto', padding: 20 }}>
        <h3>카드 세부사항</h3>
        {cardDetail ? (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div><strong>ID:</strong> {cardDetail.id}</div>
            <label style={{display:'flex',alignItems:'center',gap:8}}>
              제목
              <input className="editor-input" value={cardDetail.title} onChange={(e)=>updateCardField('title',e.target.value)} />
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              내용
              <textarea className="editor-input" value={cardDetail.content||''} onChange={(e)=>updateCardField('content',e.target.value)} rows={4} />
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              카드타입
              <select className="editor-select" value={cardDetail.cardtype||''} onChange={(e)=>updateCardField('cardtype',e.target.value)}>
                <option value="">(없음)</option>
                {cardTypes.map(ct=>(<option key={ct.cardtype_id} value={ct.cardtype_id}>{ct.cardtype_name}</option>))}
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
              기간
              <input className="editor-input" type="number" value={cardDetail.duration||''} onChange={(e)=>updateCardField('duration',e.target.value?Number(e.target.value):null)} />
            </label>

            <label style={{display:'flex',alignItems:'center',gap:8}}>
               ES
               <input className="editor-input" value={cardDetail.es||''} onChange={(e)=>updateCardField('es',e.target.value)} />
             </label>

             <label style={{display:'flex',alignItems:'center',gap:8}}>
               LS
               <input className="editor-input" value={cardDetail.ls||''} onChange={(e)=>updateCardField('ls',e.target.value)} />
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
               <input className="editor-input" type="number" value={cardDetail.price||''} onChange={(e)=>updateCardField('price',e.target.value?Number(e.target.value):null)} />
             </label>

             <label style={{display:'flex',alignItems:'center',gap:8}}>
               프로젝트
               <select className="editor-select" value={cardDetail.project_id||''} onChange={(e)=>updateCardField('project_id',e.target.value||null)}>
                 <option value="">(없음)</option>
                 {projects.map(p=>(<option key={p.project_id} value={p.project_id}>{p.project_name}</option>))}
               </select>
             </label>

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
    await window.electron.ipcRenderer.invoke('rename-cardtype', { cardtype_id: editingId, name: editingValue });
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

// 관계 관리 페이지
function RelationManage() {
  const [relations,setRelations]=useState<any[]>([]);
  const [cards,setCards]=useState<{id:string; title:string}[]>([]);
  const [relTypes,setRelTypes]=useState<{relationtype_id:number; typename:string}[]>([]);
  const [src,setSrc]=useState('');
  const [rt,setRt]=useState('');
  const [tgt,setTgt]=useState('');

  const load=async()=>{
    const res=await window.electron.ipcRenderer.invoke('get-relations') as any;
    if(res.success) setRelations(res.data);
  };
  useEffect(()=>{load();},[]);

  useEffect(()=>{
    (async()=>{
      const c=await window.electron.ipcRenderer.invoke('get-cards') as any; if(c.success) setCards(c.data);
      const r=await window.electron.ipcRenderer.invoke('get-relationtypes') as any; if(r.success) setRelTypes(r.data);
    })();
  },[]);

  const addRelation=async()=>{
    if(!src||!rt||!tgt) return;
    const res=await window.electron.ipcRenderer.invoke('create-relation',{relationtype_id:Number(rt),source:src,target:tgt}) as any;
    if(res.success){ setSrc(''); setRt(''); setTgt(''); load(); }
  };

  const del=async(id:number)=>{
    await window.electron.ipcRenderer.invoke('delete-relation',id);
    load();
  };

  return (
    <div style={{padding:20}}>
      <h2>관계 목록</h2>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        <select value={src} onChange={(e)=>setSrc(e.target.value)}>
          <option value="">Source</option>
          {cards.map(c=>(<option key={c.id} value={c.id}>{c.title}</option>))}
        </select>
        <select value={rt} onChange={(e)=>setRt(e.target.value)}>
          <option value="">Type</option>
          {relTypes.map(r=>(<option key={r.relationtype_id} value={r.relationtype_id}>{r.typename}</option>))}
        </select>
        <select value={tgt} onChange={(e)=>setTgt(e.target.value)}>
          <option value="">Target</option>
          {cards.map(c=>(<option key={c.id} value={c.id}>{c.title}</option>))}
        </select>
        <button onClick={addRelation}>추가</button>
      </div>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr><th>ID</th><th>Source</th><th>Type</th><th>Target</th><th></th></tr></thead>
        <tbody>
          {relations.map(r=> (
            <tr key={r.relation_id}>
              <td>{r.relation_id}</td>
              <td>{r.source_title || r.source}</td>
              <td>{r.typename}</td>
              <td>{r.target_title || r.target}</td>
              <td><button onClick={()=>del(r.relation_id)}>삭제</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <nav style={{ padding: 12, background: '#222' }}>
        {[
          { to: '/', label: '홈' },
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
