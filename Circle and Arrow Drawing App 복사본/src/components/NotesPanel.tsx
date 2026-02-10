import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StickyNote, X, Plus, Trash2, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
  createdAt: number;
}

interface NotesPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function NotesPanel({ isOpen, onToggle }: NotesPanelProps) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 로컬 스토리지에서 투두 불러오기
  useEffect(() => {
    const savedTodos = localStorage.getItem('milkcap-todos');
    if (savedTodos) {
      try {
        setTodos(JSON.parse(savedTodos));
      } catch (e) {
        console.error('Failed to parse todos:', e);
      }
    }
  }, []);

  // 투두 자동 저장
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('milkcap-todos', JSON.stringify(todos));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [todos]);

  const addTodo = () => {
    if (!newTodoText.trim()) return;

    const newTodo: TodoItem = {
      id: Date.now(),
      text: newTodoText.trim(),
      completed: false,
      createdAt: Date.now(),
    };

    setTodos([newTodo, ...todos]);
    setNewTodoText('');
    inputRef.current?.focus();
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const startEditing = (id: number, text: string) => {
    setEditingId(id);
    setEditingText(text);
  };

  const saveEdit = () => {
    if (editingId === null) return;
    
    if (editingText.trim()) {
      setTodos(todos.map(todo =>
        todo.id === editingId ? { ...todo, text: editingText.trim() } : todo
      ));
    }
    
    setEditingId(null);
    setEditingText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (editingId !== null) {
        saveEdit();
      } else {
        addTodo();
      }
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const completedCount = todos.filter(t => t.completed).length;

  return (
    <>
      {/* 토글 버튼 - 패널이 닫혔을 때만 표시 */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed top-4 right-4 z-40"
          >
            <Button
              onClick={onToggle}
              className="bg-white text-black border-2 border-gray-500 shadow-[4px_4px_0px_0px_rgba(100,100,100,0.3)] hover:shadow-[2px_2px_0px_0px_rgba(100,100,100,0.3)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              <StickyNote className="mr-2 h-4 w-4" />
              메모장
              {todos.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-600 text-white text-xs">
                  {todos.length - completedCount}
                </span>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 메모장 패널 */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* 오버레이 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onToggle}
              className="fixed inset-0 bg-black/20 z-40"
            />

            {/* 패널 */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[400px] bg-gray-200 border-l-4 border-gray-500 shadow-[-8px_0_16px_rgba(0,0,0,0.1)] z-50 flex flex-col"
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between p-6 border-b-2 border-gray-500 bg-gray-300">
                <div className="flex items-center gap-2">
                  <StickyNote className="h-5 w-5 text-gray-700" />
                  <h2 className="text-black" style={{ fontFamily: "'Courier New', monospace" }}>
                    할 일 목록
                  </h2>
                </div>
                <Button
                  onClick={onToggle}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-700 hover:bg-gray-400/30"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* 통계 */}
              {todos.length > 0 && (
                <div className="px-6 py-3 bg-gray-300 border-b border-gray-400/30">
                  <p className="text-xs text-gray-700" style={{ fontFamily: "'Courier New', monospace" }}>
                    {completedCount} / {todos.length} 완료
                  </p>
                </div>
              )}

              {/* 새 항목 입력 */}
              <div className="p-4 border-b-2 border-gray-500 bg-white">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={newTodoText}
                    onChange={(e) => setNewTodoText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="새 할 일 추가..."
                    className="flex-1 bg-white border-2 border-gray-500 focus:border-gray-600 focus:ring-2 focus:ring-gray-400/20 text-black placeholder:text-gray-500/50"
                    style={{ 
                      fontFamily: "'Courier New', monospace",
                      fontSize: '14px'
                    }}
                  />
                  <Button
                    onClick={addTodo}
                    size="icon"
                    className="bg-gray-600 text-white hover:bg-gray-700 border-2 border-gray-700"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 할 일 목록 */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-2">
                  <AnimatePresence>
                    {todos.map((todo) => (
                      <motion.div
                        key={todo.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                        className="group flex items-start gap-3 p-3 rounded-lg bg-white border-2 border-gray-400/30 hover:border-gray-600 transition-all"
                      >
                        <Checkbox
                          checked={todo.completed}
                          onCheckedChange={() => toggleTodo(todo.id)}
                          className="mt-1 border-2 border-gray-600 data-[state=checked]:bg-gray-600 data-[state=checked]:border-gray-600"
                        />
                        
                        <div className="flex-1 min-w-0">
                          {editingId === todo.id ? (
                            <Input
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={handleKeyDown}
                              onBlur={saveEdit}
                              autoFocus
                              className="bg-white border-2 border-[#8B6F47] focus:border-[#6B5444] text-[#3E2723]"
                              style={{ 
                                fontFamily: "'Courier New', monospace",
                                fontSize: '14px'
                              }}
                            />
                          ) : (
                            <p
                              onClick={() => startEditing(todo.id, todo.text)}
                              className={`cursor-text break-words ${
                                todo.completed 
                                  ? 'line-through text-[#8B6F47]/60' 
                                  : 'text-[#3E2723]'
                              }`}
                              style={{ 
                                fontFamily: "'Courier New', monospace",
                                fontSize: '14px',
                                lineHeight: '1.5'
                              }}
                            >
                              {todo.text}
                            </p>
                          )}
                        </div>

                        <Button
                          onClick={() => deleteTodo(todo.id)}
                          size="icon"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-[#d4183d] hover:bg-[#d4183d]/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {todos.length === 0 && (
                    <div className="text-center py-12">
                      <StickyNote className="h-12 w-12 mx-auto mb-3 text-[#8B6F47]/30" />
                      <p className="text-[#8B6F47]/50" style={{ fontFamily: "'Courier New', monospace" }}>
                        할 일을 추가해보세요
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* 푸터 */}
              <div className="p-4 border-t-2 border-[#8B6F47] bg-[#E8D5B8]">
                <p className="text-xs text-[#8B6F47] text-center" style={{ fontFamily: "'Courier New', monospace" }}>
                  항목을 클릭하여 수정 • 자동 저장됨
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
