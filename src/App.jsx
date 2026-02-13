import React, { useState, useEffect } from 'react';
import { 
  Palette, User, Lock, LayoutGrid, CheckCircle2, 
  AlertCircle, Clock, Sparkles, LogOut, Plus, 
  Edit3, Trash2, MessageCircle, ChevronRight, 
  Save, X, Activity, Image as ImageIcon, DollarSign, CreditCard, 
  Wallet, ShieldCheck, Camera, History, FileText, Download, Cloud,
  Mail, Send, FileQuestion
} from 'lucide-react';

// --- Firebase 整合連線 (使用 CDN 導入確保穩定) ---
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, 
  doc, onSnapshot, query, orderBy 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ⚠️ 重要：請在此處貼上您自己的 Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyCeHj5Kc6E_ltyXboL7cWSpFClq4FrCrvU",
  authDomain: "commission-hub-cc739.firebaseapp.com",
  projectId: "commission-hub-cc739",
  storageBucket: "commission-hub-cc739.firebasestorage.app",
  messagingSenderId: "1022991297741",
  appId: "1:1022991297741:web:df716fcd268c0d9d2c8d84"
};

// 初始化
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const PAYMENT_STATUS = {
  none: { label: '未付款', color: '#94a3b8', bg: '#f8fafc', icon: Wallet },
  deposit: { label: '已付訂金', color: '#f59e0b', bg: '#fffbeb', icon: CreditCard },
  full: { label: '已全額付清', color: '#10b981', bg: '#ecfdf5', icon: ShieldCheck },
};

// --- 共用樣式組件：這就是您要的「框框」 ---
const InputBox = ({ label, children }) => (
  <div style={{
    backgroundColor: '#ffffff',
    border: '2px solid #e2e8f0', // 明確的灰色邊框
    borderRadius: '16px',
    padding: '12px 16px',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
    transition: 'border-color 0.2s'
  }} className="hover:border-blue-300">
    <label style={{
      fontSize: '11px',
      fontWeight: '900',
      color: '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      marginBottom: '4px'
    }}>{label}</label>
    {children}
  </div>
);

// --- 主應用程式 ---
const App = () => {
  const [view, setView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [commissions, setCommissions] = useState([]); 
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "commissions"), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setCommissions(data);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (role, data) => {
    if (role === 'artist') {
      if (data.password === 'admin') setView('artist');
      else showNotification('密碼錯誤', 'error');
    } else if (role === 'client') {
      const target = commissions.find(c => c.name === data.name && c.code === data.code && c.status !== 'pending');
      if (target) {
        setCurrentUser(target);
        setView('client');
      } else {
        showNotification('找不到資料，或委託尚未被接受', 'error');
      }
    }
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-500">資料庫連線中...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[999] px-6 py-3 rounded-2xl shadow-2xl border ${notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'} flex items-center gap-3`}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span className="font-bold">{notification.msg}</span>
        </div>
      )}

      {view === 'login' && <LoginView onLogin={handleLogin} onRequest={async (d) => {
        try {
          const newItem = { ...d, code: 'PENDING', status: 'pending', note: '申請審核中', updatedAt: new Date().toISOString(), items: { avatar: { active: d.type==='avatar', progress: 0, price: 0, payment: 'none' }, halfBody: { active: d.type==='halfBody', progress: 0, price: 0, payment: 'none' }, fullBody: { active: d.type==='fullBody', progress: 0, price: 0, payment: 'none' } }, timeline: [{ date: new Date().toISOString().split('T')[0], title: '申請成功', desc: '已送出委託請求' }] };
          await addDoc(collection(db, "commissions"), newItem);
          showNotification('委託申請已送出！');
        } catch(e) { showNotification(e.message, 'error'); }
      }} />}
      
      {view === 'client' && <ClientDashboard data={commissions.find(c => c.id === currentUser.id)} onLogout={() => setView('login')} />}
      
      {view === 'artist' && <ArtistDashboard commissions={commissions} notify={showNotification} onLogout={() => setView('login')} />}
    </div>
  );
};

// --- 1. 登入介面 (強制套用框框樣式) ---
const LoginView = ({ onLogin, onRequest }) => {
  const [activeTab, setActiveTab] = useState('client');
  const [formData, setFormData] = useState({ name: '', code: '', password: '' });
  const [isReqOpen, setReqOpen] = useState(false);

  const inputStyle = {
    width: '100%',
    padding: '4px 0',
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    fontWeight: '700',
    fontSize: '16px',
    color: '#1e293b'
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 border border-slate-100">
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg"><Palette size={32}/></div>
            <h1 className="text-2xl font-black">Commission<span className="text-blue-500">Hub</span></h1>
        </div>

        <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-8">
            <button onClick={()=>setActiveTab('client')} className={`flex-1 py-2 rounded-xl text-sm font-bold ${activeTab==='client'?'bg-white shadow-sm':'text-slate-400'}`}>委託查詢</button>
            <button onClick={()=>setActiveTab('artist')} className={`flex-1 py-2 rounded-xl text-sm font-bold ${activeTab==='artist'?'bg-white shadow-sm':'text-slate-400'}`}>繪師後台</button>
        </div>

        <form onSubmit={(e)=>{ e.preventDefault(); onLogin(activeTab, formData); }} className="space-y-4">
            {activeTab === 'client' ? (
              <>
                <InputBox label="委託人名稱">
                  <input required style={inputStyle} placeholder="您的暱稱" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} />
                </InputBox>
                <InputBox label="專屬查詢編號">
                  <input required style={inputStyle} placeholder="例如：STAR01" value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} />
                </InputBox>
              </>
            ) : (
              <InputBox label="後台管理密碼">
                <input required type="password" style={inputStyle} placeholder="admin" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} />
              </InputBox>
            )}
            <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all">登入系統</button>
        </form>

        {activeTab==='client' && (
          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-bold mb-4 uppercase tracking-widest">New Commission?</p>
            <button onClick={()=>setReqOpen(true)} className="w-full py-4 border-2 border-pink-100 text-pink-500 font-black rounded-2xl bg-pink-50/50 hover:bg-pink-50 transition-all">✨ 我要發起委託</button>
          </div>
        )}
      </div>

      {isReqOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black flex items-center gap-2"><Mail className="text-pink-500"/> 發起委託</h2>
              <button onClick={()=>setReqOpen(false)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
            </div>
            <form onSubmit={(e)=>{
               e.preventDefault();
               const fd = new FormData(e.target);
               onRequest(Object.fromEntries(fd));
               setReqOpen(false);
            }} className="space-y-2">
               <InputBox label="您的名稱"><input name="name" required style={inputStyle} /></InputBox>
               <InputBox label="聯絡方式"><input name="contact" required style={inputStyle} placeholder="Email / Discord" /></InputBox>
               <InputBox label="委託項目">
                  <select name="type" style={inputStyle} className="cursor-pointer">
                    <option value="avatar">大頭貼</option>
                    <option value="halfBody">半身插畫</option>
                    <option value="fullBody">全身立繪</option>
                  </select>
               </InputBox>
               <InputBox label="需求描述"><textarea name="desc" style={{...inputStyle, height: '100px', resize: 'none'}} /></InputBox>
               <button type="submit" className="w-full py-4 bg-pink-500 text-white font-black rounded-2xl shadow-lg">送出申請</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 2. 委託人儀表板 ---
const ClientDashboard = ({ data, onLogout }) => {
  if (!data) return null;
  const activeItems = Object.entries(data.items).filter(([_, i]) => i.active);
  const [tab, setTab] = useState(activeItems[0]?.[0]);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b p-4 flex justify-between items-center px-8">
        <span className="font-black text-blue-600">CommissionHub</span>
        <button onClick={onLogout} className="text-slate-400 font-bold text-sm">登出系統</button>
      </nav>
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border">
            <h1 className="text-3xl font-black mb-2">Hi, {data.name}</h1>
            <p className="text-slate-400 font-bold text-sm mb-4">您的委託編號：#{data.code}</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full font-bold text-xs uppercase tracking-widest border border-blue-100">{data.status}</div>
        </div>
        
        {activeItems.length > 0 ? (
          <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border">
            <div className="flex border-b bg-slate-50/50">
                {activeItems.map(([key, _]) => (
                    <button key={key} onClick={()=>setTab(key)} className={`flex-1 py-5 font-black text-sm ${tab===key?'bg-white text-blue-600 border-b-2 border-blue-600':'text-slate-400'}`}>{key}</button>
                ))}
            </div>
            <div className="p-8">
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <InputBox label="委託金額"><div className="font-black text-2xl">${data.items[tab].price}</div></InputBox>
                    <div style={{ backgroundColor: PAYMENT_STATUS[data.items[tab].payment].bg, border: '2px solid transparent' }} className="rounded-[1.5rem] p-5">
                        <span style={{ color: PAYMENT_STATUS[data.items[tab].payment].color }} className="text-[10px] font-black uppercase mb-1 block">付款狀態</span>
                        <div style={{ color: PAYMENT_STATUS[data.items[tab].payment].color }} className="font-black text-lg">{PAYMENT_STATUS[data.items[tab].payment].label}</div>
                    </div>
                </div>
                <InputBox label="進度預覽">
                    <div className="aspect-video w-full bg-slate-100 rounded-xl overflow-hidden mt-2 border">
                        {data.items[tab].preview ? <img src={data.items[tab].preview} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold uppercase text-xs">Drawing...</div>}
                    </div>
                </InputBox>
                <div className="mt-8">
                    <div className="flex justify-between mb-2 font-black text-xs uppercase text-slate-400">Progress <span>{data.items[tab].progress}%</span></div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner"><div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{width: `${data.items[tab].progress}%`}}></div></div>
                </div>
            </div>
          </div>
        ) : <div className="p-20 text-center font-bold text-slate-300 border-2 border-dashed rounded-[2rem]">尚無進行中的項目</div>}
      </main>
    </div>
  );
};

// --- 3. 繪師後台 ---
const ArtistDashboard = ({ commissions, notify, onLogout }) => {
  const [editItem, setEditItem] = useState(null);

  const handleSave = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = editItem; 
      // 這裡簡化處理，實際應用需把表單值同步回 data 對象
      try {
          if(data.id) await updateDoc(doc(db, "commissions", data.id), { ...data, updatedAt: new Date().toISOString() });
          else await addDoc(collection(db, "commissions"), { ...data, updatedAt: new Date().toISOString() });
          notify('雲端同步成功');
          setEditItem(null);
      } catch(e) { notify(e.message, 'error'); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-slate-900 text-white p-5 flex justify-between items-center px-8 shadow-xl">
        <span className="font-black tracking-tight">Artist Studio</span>
        <button onClick={onLogout} className="text-slate-400 font-bold text-xs bg-white/10 px-4 py-2 rounded-xl">Logout</button>
      </nav>

      <main className="max-w-6xl mx-auto p-10">
        <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-black">委託管理中心</h2>
            <button onClick={()=>setEditItem({ name: '', code: '', status: 'waiting', note: '', items: { avatar: { active: true, progress: 0, price: 0, payment: 'none' }, halfBody: { active: false, progress: 0, price: 0, payment: 'none' }, fullBody: { active: false, progress: 0, price: 0, payment: 'none' } } })} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all">+ 新增委託</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {commissions.map(c => (
                <div key={c.id} className={`bg-white p-8 rounded-[2rem] shadow-sm border-2 ${c.status==='pending'?'border-pink-200 bg-pink-50/20':'border-slate-100'} hover:shadow-xl transition-all`}>
                    <div className="flex justify-between mb-4">
                        <div><h3 className="font-black text-xl">{c.name}</h3><span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">#{c.code}</span></div>
                        <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${c.status==='pending'?'bg-pink-500 text-white':'bg-slate-100 text-slate-500'}`}>{c.status}</div>
                    </div>
                    <button onClick={()=>setEditItem(c)} className="w-full py-3 bg-slate-100 rounded-xl font-black text-xs hover:bg-blue-50 hover:text-blue-600 transition-all">管理此委託</button>
                </div>
            ))}
        </div>
      </main>

      {editItem && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-10 shadow-2xl relative">
                  <button onClick={()=>setEditItem(null)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full"><X/></button>
                  <h2 className="text-2xl font-black mb-8">編輯委託案資料</h2>
                  <form onSubmit={handleSave} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <InputBox label="委託人名稱"><input className="font-bold w-full bg-transparent border-none outline-none" value={editItem.name} onChange={e=>setEditItem({...editItem, name: e.target.value})} /></InputBox>
                          <InputBox label="查詢編號"><input className="font-bold w-full bg-transparent border-none outline-none text-blue-600" value={editItem.code} onChange={e=>setEditItem({...editItem, code: e.target.value})} /></InputBox>
                      </div>
                      <InputBox label="聯絡方式"><input className="font-bold w-full bg-transparent border-none outline-none" value={editItem.contact || ''} onChange={e=>setEditItem({...editItem, contact: e.target.value})} /></InputBox>
                      <InputBox label="委託狀態">
                        <select className="font-bold w-full bg-transparent border-none outline-none" value={editItem.status} onChange={e=>setEditItem({...editItem, status: e.target.value})}>
                            <option value="pending">待核准 (Pending)</option>
                            <option value="waiting">排單中 (Waiting)</option>
                            <option value="working">繪製中 (Working)</option>
                            <option value="done">已完稿 (Done)</option>
                        </select>
                      </InputBox>
                      <InputBox label="備註內容"><textarea style={{height: '80px', width:'100%', border:'none', outline:'none', fontWeight:'700', resize:'none'}} value={editItem.note} onChange={e=>setEditItem({...editItem, note: e.target.value})} /></InputBox>
                      
                      <div className="pt-6 border-t flex gap-4">
                          <button type="button" onClick={async ()=>{
                              if(confirm('確定要刪除嗎？')){
                                  await deleteDoc(doc(db, "commissions", editItem.id));
                                  notify('資料已刪除');
                                  setEditItem(null);
                              }
                          }} className="px-6 py-4 bg-red-50 text-red-500 font-bold rounded-2xl hover:bg-red-100 transition-all">刪除</button>
                          <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700">儲存變更並同步</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;