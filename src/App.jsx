import React, { useState, useEffect } from 'react';
import { 
  Palette, User, Lock, LayoutGrid, CheckCircle2, 
  AlertCircle, Clock, Sparkles, LogOut, Plus, 
  Edit3, Trash2, MessageCircle, ChevronRight, 
  Save, X, Activity, Image as ImageIcon, DollarSign, CreditCard, 
  Wallet, ShieldCheck, Camera, History, FileText, Download, Cloud,
  Mail, Send, FileQuestion, Key, Settings, UserPlus, List
} from 'lucide-react';

// --- Firebase 整合連線 ---
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, 
  doc, onSnapshot, query, orderBy, setDoc, getDoc, where 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ⚠️ 重要：保留您的 Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyCeHj5Kc6E_ltyXboL7cWSpFClq4FrCrvU",
  authDomain: "commission-hub-cc739.firebaseapp.com",
  projectId: "commission-hub-cc739",
  storageBucket: "commission-hub-cc739.firebasestorage.app",
  messagingSenderId: "1022991297741",
  appId: "1:1022991297741:web:df716fcd268c0d9d2c8d84"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// --- 樣式組件：方框容器 ---
const InputBox = ({ label, children, style = {} }) => (
  <div style={{
    backgroundColor: '#ffffff',
    border: '2px solid #cbd5e1',
    borderRadius: '16px',
    padding: '12px 16px',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
    ...style
  }}>
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

const inputBaseStyle = {
  width: '100%',
  padding: '4px 0',
  backgroundColor: 'transparent',
  border: 'none',
  outline: 'none',
  fontWeight: '700',
  fontSize: '16px',
  color: '#1e293b'
};

// --- 主應用程式 ---
const App = () => {
  const [view, setView] = useState('login'); // login, client, artist
  const [currentUser, setCurrentUser] = useState(null); // { name: '...', role: 'client' }
  const [commissions, setCommissions] = useState([]); 
  const [artistSettings, setArtistSettings] = useState({ password: 'admin' });
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. 監聽繪師設定
  useEffect(() => {
    const settingsRef = doc(db, "settings", "admin_config");
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) setArtistSettings(docSnap.data());
      else setDoc(settingsRef, { password: 'admin' });
    });
    return () => unsubscribe();
  }, []);

  // 2. 全局監聽所有委託 (繪師用，且委託人過濾用)
  useEffect(() => {
    const q = query(collection(db, "commissions"), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCommissions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAuth = async (action, data) => {
    if (data.role === 'artist') {
      if (data.password === artistSettings.password) {
        setCurrentUser({ name: '繪師管理員', role: 'artist' });
        setView('artist');
      } else showNotification('管理密碼錯誤', 'error');
      return;
    }

    // 委託人邏輯
    const userRef = doc(db, "users", data.name);
    const userSnap = await getDoc(userRef);

    if (action === 'register') {
      if (userSnap.exists()) {
        showNotification('此名稱已被註冊', 'error');
      } else {
        await setDoc(userRef, { name: data.name, password: data.password });
        showNotification('註冊成功！歡迎加入');
        setCurrentUser({ name: data.name, role: 'client' });
        setView('client');
      }
    } else {
      if (userSnap.exists() && userSnap.data().password === data.password) {
        setCurrentUser({ name: data.name, role: 'client' });
        setView('client');
      } else {
        showNotification('名稱或密碼錯誤', 'error');
      }
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-blue-500 font-bold">同步雲端資料中...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[999] px-6 py-3 rounded-2xl shadow-2xl border ${notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'} flex items-center gap-3`}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span className="font-bold">{notification.msg}</span>
        </div>
      )}

      {view === 'login' && <LoginView onAuth={handleAuth} />}
      
      {view === 'client' && (
        <ClientDashboard 
          user={currentUser}
          allCommissions={commissions} 
          onLogout={() => { setView('login'); setCurrentUser(null); }} 
          notify={showNotification}
        />
      )}
      
      {view === 'artist' && (
        <ArtistDashboard 
          commissions={commissions} 
          artistSettings={artistSettings}
          notify={showNotification} 
          onLogout={() => { setView('login'); setCurrentUser(null); }} 
        />
      )}
    </div>
  );
};

// --- 1. 登入/註冊介面 ---
const LoginView = ({ onAuth }) => {
  const [activeTab, setActiveTab] = useState('login'); // login, register, artist
  const [formData, setFormData] = useState({ name: '', password: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAuth(activeTab, { ...formData, role: activeTab === 'artist' ? 'artist' : 'client' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-blue-50">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-200">
        <div className="text-center mb-10">
            <div className="w-20 h-20 bg-blue-600 rounded-[1.8rem] flex items-center justify-center mx-auto mb-6 text-white shadow-xl rotate-3 hover:rotate-0 transition-transform"><Palette size={40}/></div>
            <h1 className="text-3xl font-black">Commission<span className="text-blue-500">Hub</span></h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Member Account System</p>
        </div>

        <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-10 overflow-x-auto">
            <button onClick={()=>setActiveTab('login')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all whitespace-nowrap px-4 ${activeTab==='login'?'bg-white text-blue-600 shadow-sm':'text-slate-400'}`}>登入</button>
            <button onClick={()=>setActiveTab('register')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all whitespace-nowrap px-4 ${activeTab==='register'?'bg-white text-pink-500 shadow-sm':'text-slate-400'}`}>註冊帳號</button>
            <button onClick={()=>setActiveTab('artist')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all whitespace-nowrap px-4 ${activeTab==='artist'?'bg-white text-slate-800 shadow-sm':'text-slate-400'}`}>繪師端</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
            <InputBox label={activeTab==='artist'?'管理員帳號':'您的會員名稱'}>
              <input 
                required 
                style={inputBaseStyle} 
                placeholder={activeTab==='artist'?'admin':'例如：星野'} 
                value={formData.name} 
                onChange={e=>setFormData({...formData, name: e.target.value})} 
              />
            </InputBox>
            <InputBox label="進入密碼">
              <input 
                required 
                type="password" 
                style={inputBaseStyle} 
                placeholder="請輸入密碼" 
                value={formData.password} 
                onChange={e=>setFormData({...formData, password: e.target.value})} 
              />
            </InputBox>
            
            <button type="submit" className={`w-full py-5 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 text-lg mt-6 ${activeTab==='register'?'bg-pink-500 hover:bg-pink-600 shadow-pink-100':'bg-blue-600 hover:bg-blue-700 shadow-blue-100'}`}>
                {activeTab === 'login' ? '登入帳號' : activeTab === 'register' ? '建立帳號' : '進入管理後台'}
            </button>
        </form>
      </div>
    </div>
  );
};

// --- 2. 委託人儀表板 (會員版) ---
const ClientDashboard = ({ user, allCommissions, onLogout, notify }) => {
  const [isRequestOpen, setRequestOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  
  // 過濾出屬於該使用者的委託
  const myCommissions = allCommissions.filter(c => c.userName === user.name);

  const handleNewRequest = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    
    try {
      const newItem = {
        userName: user.name, // 綁定會員名稱
        name: user.name,
        contact: data.contact,
        desc: data.desc,
        type: data.type,
        code: 'PENDING',
        status: 'pending',
        updatedAt: new Date().toISOString(),
        items: { 
            avatar: { active: data.type==='avatar', progress: 0, price: 0, payment: 'none' }, 
            halfBody: { active: data.type==='halfBody', progress: 0, price: 0, payment: 'none' }, 
            fullBody: { active: data.type==='fullBody', progress: 0, price: 0, payment: 'none' } 
        },
        timeline: [{ date: new Date().toISOString().split('T')[0], title: '申請成功', desc: '已從會員帳號提交委託請求' }]
      };
      await addDoc(collection(db, "commissions"), newItem);
      notify('委託申請已送出！');
      setRequestOpen(false);
    } catch(err) { notify('發送失敗', 'error'); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b p-4 flex justify-between items-center px-10 shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white"><User size={16}/></div>
            <span className="font-black text-slate-800">{user.name} 的空間</span>
        </div>
        <button onClick={onLogout} className="text-slate-400 font-bold text-sm hover:text-red-500 transition-colors">登出帳號</button>
      </nav>

      <main className="max-w-5xl mx-auto p-8">
        <div className="flex justify-between items-end mb-10">
            <div>
                <h1 className="text-4xl font-black text-slate-800 tracking-tight">我的委託紀錄</h1>
                <p className="text-slate-400 font-bold mt-1">您可以在此查看所有與繪師的合作進度</p>
            </div>
            <button onClick={()=>setRequestOpen(true)} className="bg-pink-500 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-xl shadow-pink-100 hover:bg-pink-600 transition-all flex items-center gap-2">
                <Plus size={20}/> 新的委託
            </button>
        </div>

        {myCommissions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {myCommissions.map(c => (
              <div key={c.id} onClick={()=>setSelectedProject(c)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-slate-100 hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer group relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="font-black text-xl text-slate-800">{c.type === 'avatar'?'大頭貼':c.type==='halfBody'?'半身插畫':'全身立繪'}</h3>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">#{c.code}</span>
                    </div>
                    <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${c.status==='pending'?'bg-pink-500 text-white animate-pulse':'bg-blue-50 text-blue-500 border border-blue-100'}`}>{c.status}</div>
                </div>
                <div className="flex items-center justify-between mt-10">
                    <div className="text-xs font-bold text-slate-400">更新於 {c.updatedAt.split('T')[0]}</div>
                    <ChevronRight className="text-slate-200 group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-32 text-center border-4 border-dashed border-slate-200 rounded-[3rem]">
            <Cloud size={64} className="mx-auto text-slate-200 mb-6" />
            <p className="font-black text-slate-300 uppercase tracking-[0.2em]">目前還沒有任何委託紀錄</p>
          </div>
        )}
      </main>

      {/* 委託詳情彈窗 */}
      {selectedProject && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl relative border border-white my-8">
            <button onClick={()=>setSelectedProject(null)} className="absolute top-8 right-8 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-all"><X/></button>
            
            <div className="mb-10">
                <h2 className="text-3xl font-black text-slate-800 mb-2">委託詳情</h2>
                <div className="flex gap-2">
                   <div className="px-4 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-500 uppercase tracking-widest">#{selectedProject.code}</div>
                   <div className="px-4 py-1 bg-blue-50 rounded-full text-xs font-bold text-blue-500 uppercase tracking-widest">{selectedProject.status}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <InputBox label="專案金額"><div className="text-3xl font-black text-slate-800">${selectedProject.items[selectedProject.type]?.price || 0}</div></InputBox>
                <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">付款狀況</label>
                    <div className="font-black text-lg text-slate-700">{selectedProject.items[selectedProject.type]?.payment || '未確認'}</div>
                </div>
            </div>

            <InputBox label="當前繪製進度預覽">
                <div className="aspect-video w-full bg-slate-100 rounded-2xl overflow-hidden mt-4 border shadow-inner">
                    {selectedProject.items[selectedProject.type]?.preview ? (
                        <img src={selectedProject.items[selectedProject.type].preview} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 font-black uppercase text-xs">Waiting for Drawing...</div>
                    )}
                </div>
            </InputBox>

            <div className="mt-10 p-8 bg-blue-600 rounded-[2rem] text-white shadow-xl shadow-blue-100">
                <div className="flex justify-between mb-4">
                    <span className="font-black text-xs uppercase tracking-widest opacity-70">Project Progress</span>
                    <span className="font-black text-2xl">{selectedProject.items[selectedProject.type]?.progress || 0}%</span>
                </div>
                <div className="h-4 bg-white/20 rounded-full overflow-hidden p-1 shadow-inner">
                    <div className="h-full bg-white rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{width: `${selectedProject.items[selectedProject.type]?.progress || 0}%`}}></div>
                </div>
            </div>

            <div className="mt-8 border-t pt-8">
                <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2"><MessageCircle size={18}/> 繪師留言</h3>
                <p className="bg-slate-50 p-6 rounded-2xl text-sm leading-relaxed italic text-slate-600 border border-slate-100">「{selectedProject.note || '繪師尚未留下備註。'}」</p>
            </div>
          </div>
        </div>
      )}

      {/* 新增委託彈窗 */}
      {isRequestOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl border border-white">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-black flex items-center gap-3"><Mail className="text-pink-500"/> 發起新委託</h2>
              <button onClick={()=>setRequestOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-all"><X size={20}/></button>
            </div>
            <form onSubmit={handleNewRequest} className="space-y-2">
               <InputBox label="聯絡方式資訊"><input name="contact" required style={inputBaseStyle} placeholder="Discord ID / Email" /></InputBox>
               <InputBox label="委託案件類別">
                  <select name="type" style={inputBaseStyle} className="cursor-pointer">
                    <option value="avatar">大頭貼 / Icon</option>
                    <option value="halfBody">半身插畫 / Half Body</option>
                    <option value="fullBody">全身立繪 / Full Body</option>
                  </select>
               </InputBox>
               <InputBox label="需求細節簡述"><textarea name="desc" placeholder="角色特徵、構圖、色調要求..." style={{...inputBaseStyle, height: '120px', resize: 'none'}} /></InputBox>
               <button type="submit" className="w-full py-5 bg-pink-500 text-white font-black rounded-2xl shadow-xl shadow-pink-100 hover:bg-pink-600 transition-all text-lg mt-6">送出委託請求</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 3. 繪師後台 (保持連動功能) ---
const ArtistDashboard = ({ commissions, artistSettings, notify, onLogout }) => {
  const [editItem, setEditItem] = useState(null);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [newAdminPwd, setNewAdminPwd] = useState('');

  const handleSave = async (e) => {
      e.preventDefault();
      try {
          await updateDoc(doc(db, "commissions", editItem.id), { ...editItem, updatedAt: new Date().toISOString() });
          notify('雲端同步成功');
          setEditItem(null);
      } catch(e) { notify(e.message, 'error'); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-slate-900 text-white p-5 flex justify-between items-center px-8 shadow-2xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg"><Palette size={18}/></div>
          <span className="font-black tracking-tight text-xl">Artist Studio</span>
        </div>
        <div className="flex gap-4">
            <button onClick={()=>setSettingsOpen(true)} className="text-slate-400 font-bold text-xs bg-white/5 px-4 py-2 rounded-xl hover:bg-white/10 flex items-center gap-1 transition-all"><Settings size={14}/> 設定</button>
            <button onClick={onLogout} className="text-slate-400 font-bold text-xs bg-white/5 px-4 py-2 rounded-xl hover:bg-red-500/20 transition-all">登出</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-10">
        <div className="flex justify-between items-end mb-16">
            <div>
              <h2 className="text-4xl font-black text-slate-800 tracking-tight">後台管理中心</h2>
              <p className="text-slate-400 font-bold mt-1">管理所有會員發起的雲端案件</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {commissions.map(c => (
                <div key={c.id} className={`bg-white p-10 rounded-[2.5rem] shadow-sm border-2 ${c.status==='pending'?'border-pink-200 bg-pink-50/20':'border-slate-100'} hover:shadow-2xl transition-all relative overflow-hidden group`}>
                    <div className="flex justify-between mb-6">
                        <div>
                          <h3 className="font-black text-2xl text-slate-800 group-hover:text-blue-600 transition-colors">{c.userName}</h3>
                          <span className="text-[10px] font-black text-slate-300 tracking-widest uppercase">#{c.code}</span>
                        </div>
                        <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-sm ${c.status==='pending'?'bg-pink-500 text-white animate-pulse':'bg-slate-100 text-slate-400'}`}>{c.status}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl mb-8 border border-slate-100">
                        <div className="text-[10px] font-black text-slate-400 uppercase mb-1">委託類別</div>
                        <div className="font-bold text-slate-700">{c.type}</div>
                    </div>
                    <button onClick={()=>setEditItem(c)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-blue-600 transition-all">管理此委託</button>
                </div>
            ))}
        </div>
      </main>

      {/* 編輯細節彈窗 (繪師用) */}
      {editItem && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-[3.5rem] w-full max-w-xl p-12 shadow-2xl relative border border-white my-8">
                  <button onClick={()=>setEditItem(null)} className="absolute top-8 right-8 p-3 bg-slate-100 rounded-full hover:bg-slate-200"><X size={28}/></button>
                  <h2 className="text-3xl font-black mb-10 text-slate-800 tracking-tight">編輯委託案內容</h2>
                  <form onSubmit={handleSave} className="space-y-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InputBox label="委託人 (會員)"><div className="font-black py-1 text-slate-400">{editItem.userName}</div></InputBox>
                          <InputBox label="專屬查詢編號"><input className="font-black w-full bg-transparent border-none outline-none text-blue-600" value={editItem.code} onChange={e=>setEditItem({...editItem, code: e.target.value})} /></InputBox>
                      </div>
                      <InputBox label="當前案件狀態">
                        <select className="font-black w-full bg-transparent border-none outline-none cursor-pointer" value={editItem.status} onChange={e=>setEditItem({...editItem, status: e.target.value})}>
                            <option value="pending">待核准 (Pending)</option>
                            <option value="waiting">排單中 (Waiting)</option>
                            <option value="working">繪製中 (Working)</option>
                            <option value="done">已完稿 (Done)</option>
                        </select>
                      </InputBox>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <InputBox label="目前進度 %"><input type="number" className="font-black w-full bg-transparent border-none outline-none" value={editItem.items[editItem.type].progress} onChange={e=>{
                            const newItems = {...editItem.items};
                            newItems[editItem.type].progress = parseInt(e.target.value);
                            setEditItem({...editItem, items: newItems});
                         }} /></InputBox>
                         <InputBox label="委託金額 $"><input type="number" className="font-black w-full bg-transparent border-none outline-none" value={editItem.items[editItem.type].price} onChange={e=>{
                            const newItems = {...editItem.items};
                            newItems[editItem.type].price = parseInt(e.target.value);
                            setEditItem({...editItem, items: newItems});
                         }} /></InputBox>
                      </div>

                      <InputBox label="付款狀況"><input className="font-bold w-full bg-transparent border-none outline-none" value={editItem.items[editItem.type].payment} onChange={e=>{
                        const newItems = {...editItem.items};
                        newItems[editItem.type].payment = e.target.value;
                        setEditItem({...editItem, items: newItems});
                      }} placeholder="例: 已收訂金" /></InputBox>
                      
                      <InputBox label="預覽圖連結"><input className="font-bold w-full bg-transparent border-none outline-none text-xs text-blue-400" value={editItem.items[editItem.type].preview || ''} onChange={e=>{
                        const newItems = {...editItem.items};
                        newItems[editItem.type].preview = e.target.value;
                        setEditItem({...editItem, items: newItems});
                      }} placeholder="https://..." /></InputBox>

                      <InputBox label="繪師備註內容"><textarea style={{height: '80px', width:'100%', border:'none', outline:'none', fontWeight:'700', fontSize:'14px', resize:'none'}} value={editItem.note} onChange={e=>setEditItem({...editItem, note: e.target.value})} /></InputBox>
                      
                      <div className="pt-8 border-t border-slate-100 flex gap-5 mt-4">
                          <button type="button" onClick={async ()=>{
                              if(confirm('確定要永久刪除此委託紀錄嗎？')){
                                  await deleteDoc(doc(db, "commissions", editItem.id));
                                  notify('資料已從雲端移除');
                                  setEditItem(null);
                              }
                          }} className="px-8 py-5 bg-red-50 text-red-500 font-black rounded-[1.5rem] hover:bg-red-100 transition-all uppercase text-xs tracking-widest">刪除</button>
                          <button type="submit" className="flex-1 py-5 bg-blue-600 text-white font-black rounded-[1.5rem] shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all text-lg uppercase">同步雲端變更</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* 繪師設定彈窗 */}
      {isSettingsOpen && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl border border-white">
              <h2 className="text-xl font-black mb-8 text-slate-800 flex items-center gap-2"><Settings size={20}/> 系統安全設定</h2>
              <form onSubmit={async (e)=>{
                  e.preventDefault();
                  await updateDoc(doc(db, "settings", "admin_config"), { password: newAdminPwd });
                  notify('管理密碼更新成功');
                  setSettingsOpen(false);
              }} className="space-y-4">
                 <InputBox label="設定新的管理密碼">
                    <input required type="password" style={inputBaseStyle} placeholder="輸入新密碼" value={newAdminPwd} onChange={e=>setNewAdminPwd(e.target.value)} />
                 </InputBox>
                 <div className="flex gap-3">
                    <button type="button" onClick={()=>setSettingsOpen(false)} className="flex-1 py-4 bg-slate-100 rounded-xl font-bold">取消</button>
                    <button type="submit" className="flex-1 py-4 bg-slate-900 text-white font-black rounded-xl shadow-lg">儲存密碼</button>
                 </div>
              </form>
            </div>
          </div>
      )}
    </div>
  );
};

export default App;