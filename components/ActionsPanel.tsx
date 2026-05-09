'use client';

import { useState, useMemo } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Star } from 'lucide-react';
import { CATEGORIES } from '@/lib/types';
import type { Action } from '@/lib/types';

interface ActionsPanelProps {
  actions: Action[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (action: Omit<Action, 'id' | 'completed' | 'doneAt'>) => void;
  showAdd: boolean;
  setShowAdd: (v: boolean) => void;
}

export default function ActionsPanel({ actions, onToggle, onDelete, onAdd, showAdd, setShowAdd }: ActionsPanelProps) {
  const sorted = useMemo(() => [...actions].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if ((a.priority || 3) !== (b.priority || 3)) return (a.priority || 3) - (b.priority || 3);
    if (a.high_leverage !== b.high_leverage) return a.high_leverage ? -1 : 1;
    return 0;
  }), [actions]);
  const completed = actions.filter(a => a.completed).length;
  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-sm">
      <div className="flex items-center justify-between p-5 border-b border-neutral-800">
        <div>
          <div className="text-[10px] tracking-[0.3em] text-neutral-500">ACTIONS</div>
          <div className="text-sm text-neutral-400 mt-0.5">{completed} of {actions.length} done</div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-neutral-400 hover:text-neutral-100 flex items-center gap-1.5 transition-colors">
          <Plus size={14} /> Add manual action
        </button>
      </div>
      {showAdd && <AddActionForm onAdd={onAdd} onCancel={() => setShowAdd(false)} />}
      <ul className="divide-y divide-neutral-800">
        {sorted.map(a => <ActionRow key={a.id} action={a} onToggle={onToggle} onDelete={onDelete} />)}
      </ul>
    </section>
  );
}

function ActionRow({ action, onToggle, onDelete }: { action: Action; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  const cat = CATEGORIES[action.category] || CATEGORIES.admin;
  return (
    <li className={`p-4 flex items-start gap-3 group ${action.completed ? 'opacity-50' : ''}`}>
      <button onClick={() => onToggle(action.id)} className="mt-0.5 flex-shrink-0 text-neutral-400 hover:text-amber-300 transition-colors">
        {action.completed ? <CheckCircle2 size={18} className="text-amber-300" /> : <Circle size={18} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-[9px] tracking-[0.15em] px-1.5 py-0.5 rounded-sm ${cat.bg} ${cat.accent} ${cat.border} border`}>{cat.short}</span>
          <span className="text-[10px] text-neutral-500 tracking-wide uppercase">P{action.priority || 3}</span>
          {action.high_leverage && (
            <span className="inline-flex items-center gap-1 text-[9px] tracking-[0.15em] px-1.5 py-0.5 rounded-sm bg-amber-300/15 text-amber-300 border border-amber-300/30">
              <Star size={9} className="fill-amber-300" /> HIGH LEVERAGE
            </span>
          )}
          <span className="text-[10px] text-neutral-500 ml-auto">{action.hours}h</span>
        </div>
        <div className={`text-sm leading-snug ${action.completed ? 'line-through text-neutral-500' : 'text-neutral-100'}`}>{action.title}</div>
        {action.detail && <div className="text-xs text-neutral-400 mt-1 leading-relaxed">{action.detail}</div>}
        {action.account && <div className="text-[10px] text-neutral-500 mt-1.5 uppercase tracking-wide">→ {action.account}</div>}
      </div>
      <button onClick={() => onDelete(action.id)} className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-400 transition-all"><Trash2 size={14} /></button>
    </li>
  );
}

function AddActionForm({ onAdd, onCancel }: { onAdd: (a: Omit<Action, 'id' | 'completed' | 'doneAt'>) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [account, setAccount] = useState('');
  const [hours, setHours] = useState('1');
  const [category, setCategory] = useState<Action['category']>('selling');
  const [priority, setPriority] = useState('2');
  const submit = () => {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), detail: detail.trim(), account: account.trim() || null, hours: Number(hours) || 0.5, category, priority: Number(priority), high_leverage: false });
  };
  const inp = "bg-neutral-900 border border-neutral-800 rounded-sm px-3 py-2 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-300/50";
  return (
    <div className="p-4 bg-neutral-950/50 border-b border-neutral-800 space-y-2">
      <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Action title" className={`w-full ${inp} text-sm`} />
      <input type="text" value={detail} onChange={e => setDetail(e.target.value)} placeholder="Detail or outcome (optional)" className={`w-full ${inp} text-sm`} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <input type="text" value={account} onChange={e => setAccount(e.target.value)} placeholder="Account" className={`${inp} text-xs`} />
        <select value={category} onChange={e => setCategory(e.target.value as Action['category'])} className={`${inp} text-xs`}>
          <option value="selling">Selling</option>
          <option value="prospecting">Prospecting</option>
          <option value="internal">Internal</option>
          <option value="admin">Admin</option>
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)} className={`${inp} text-xs`}>
          <option value="1">P1 — Must</option>
          <option value="2">P2 — Should</option>
          <option value="3">P3 — Nice</option>
        </select>
        <input type="number" step="0.5" min="0.5" value={hours} onChange={e => setHours(e.target.value)} placeholder="Hours" className={`${inp} text-xs`} />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="text-xs text-neutral-400 hover:text-neutral-200 px-3 py-1.5">Cancel</button>
        <button onClick={submit} className="text-xs bg-amber-300 text-neutral-950 hover:bg-amber-200 px-3 py-1.5 rounded-sm font-medium">Add</button>
      </div>
    </div>
  );
}
