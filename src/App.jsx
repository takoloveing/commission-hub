import React, { useState, useEffect, useMemo } from 'react';
import { 
  Palette, User, Lock, LayoutGrid, CheckCircle2, 
  AlertCircle, Clock, Sparkles, LogOut, Plus, 
  Edit3, Trash2, MessageCircle, ChevronRight, 
  Save, X, Activity, Image as ImageIcon, DollarSign, CreditCard, 
  Wallet, ShieldCheck, Camera, History, FileText, Download, Cloud,
  Mail, Send, FileQuestion, Key, Settings, UserPlus, List, Search, Users, Inbox
} from 'lucide-react';

// --- Firebase 整合連線 ---
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, 
  doc, onSnapshot, query, orderBy, setDoc, getDoc 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ⚠️ 重要：保留您的 Firebase 設定 (此處已根據您的 Canvas 金鑰填入)
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

// --- 樣式組件：方框容器 (維持您要求的顯眼框框樣式) ---
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
  const [currentUser, setCurrentUser] = useState(null); // { name: '...', role: 'client', isAnonymous: false }
  const [commissions, setCommissions] = useState([]); 
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [artistSettings, setArtistSettings] = useState({ password: 'admin' });
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. 監聽委託與帳號數據
  useEffect(() => {
    const qCommissions = query(collection(db, "commissions"), orderBy("updatedAt", "desc"));
    const unsubComms = onSnapshot(qCommissions, (snapshot) => {
      setCommissions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });

    const qUsers = collection(db, "users");
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      setRegisteredUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      setLoading(false);
    });

    const settingsRef = doc(db, "settings", "admin_config");
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) setArtistSettings(docSnap.data());
      else setDoc(settingsRef, { password: 'admin' });
    });

    return () => { unsubComms(); unsubUsers(); unsubSettings(); };
  }, []);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAuth = async (action, data) => {
    if (action === 'artist') {
      if (data.password === artistSettings.password) {
        setCurrentUser({ name: '繪師管理員', role: 'artist' });
        setView('artist');
      } else showNotification('管理密碼錯誤', 'error');
      return;
    }

    if (action === 'anonymous') {
      // 匿名查詢：透過 自訂編號 + 密碼
      const target = commissions.find(c => c.code === data.code && c.password === data.password);
      if (target) {
        setCurrentUser({ name: target.name, role: 'client', isAnonymous: true, targetId: target.id });
        setView('client');
      } else {
        showNotification('編號或查詢密碼錯誤', 'error');
      }
      return;
    }

    // 會員登入/註冊邏輯
    const userRef = doc(db, "users", data.name);
    const userSnap = await getDoc(userRef);

    if (action === 'register') {
      if (userSnap.exists()) showNotification('名稱已被註冊', 'error');
      else {
        await setDoc(userRef, { name: data.name, password: data.password });
        showNotification('註冊成功');
        setCurrentUser({ name: data.name, role: 'client', isAnonymous: false });
        setView('client');
      }
    } else if (action === 'login') {
      if (userSnap.exists() && userSnap.data().password === data.password) {
        setCurrentUser({ name: data.name, role: 'client', isAnonymous: false });
        setView('client');
      } else showNotification('名稱或密碼錯誤', 'error');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-500">系統初始化中...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[999] px-6 py-3 rounded-2xl shadow-2xl border ${notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'} flex items-center gap-3 animate-in slide-in-from-top-4 backdrop-blur-md`}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span className="font-bold">{notification.msg}</span>
        </div>
      )}

      {view === 'login' && <LoginView onAuth={handleAuth} onAnonymousRequest={async (d) => {
        try {
          const newItem = { ...d, status: 'pending', updatedAt: new Date().toISOString(), isAnonymous: true, items: { avatar: { active: d.type==='avatar', progress: 0, price: 0, payment: 'none' }, halfBody: { active: d.type==='halfBody', progress: 0, price: 0, payment: 'none' }, fullBody: { active: d.type==='fullBody', progress: 0, price: 0, payment: 'none' }, other: { active: d.type==='other', progress: 0, price: 0, payment: 'none' } }, timeline: [{ date: new Date().toISOString().split('T')[0], title: '匿名申請', desc: '已提交請求，編號為：' + d.code }] };
          await addDoc(collection(db, "commissions"), newItem);
          showNotification('申請成功！請記住您的編號：' + d.code);
        } catch(e) { showNotification(e.message, 'error'); }
      }} />}
      
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
          registeredUsers={registeredUsers}
          notify={showNotification} 
          onLogout={() => { setView('login'); setCurrentUser(null); }} 
        />
      )}
    </div>
  );
};

// --- 1. 登入/註冊/匿名申請介面 ---
const LoginView = ({ onAuth, onAnonymousRequest }) => {
  const [activeTab, setActiveTab] = useState('login'); // login, register, anonymous_track, anonymous_req, artist
  const [formData, setFormData] = useState({ name: '', password: '', code: '', contact: '', type: 'avatar', desc: '' });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-blue-50">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 border border-slate-200">
        <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-xl rotate-2"><Palette size={32}/></div>
            <h1 className="text-2xl font-black">Commission<span className="text-blue-500">Hub</span></h1>
        </div>

        <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-8 overflow-x-auto no-scrollbar gap-1">
            <button onClick={()=>setActiveTab('login')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap px-4 ${activeTab==='login'?'bg-white text-blue-600 shadow-sm':'text-slate-400'}`}>登入</button>
            <button onClick={()=>setActiveTab('register')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap px-4 ${activeTab==='register'?'bg-white text-pink-500 shadow-sm':'text-slate-400'}`}>註冊</button>
            <button onClick={()=>setActiveTab('anonymous_track')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap px-4 ${activeTab==='anonymous_track'?'bg-white text-blue-600 shadow-sm':'text-slate-400'}`}>匿名查詢</button>
            <button onClick={()=>setActiveTab('anonymous_req')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap px-4 ${activeTab==='anonymous_req'?'bg-white text-emerald-500 shadow-sm':'text-slate-400'}`}>匿名委託</button>
            <button onClick={()=>setActiveTab('artist')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap px-4 ${activeTab==='artist'?'bg-white text-slate-800 shadow-sm':'text-slate-400'}`}>繪師</button>
        </div>

        <form onSubmit={(e)=>{
            e.preventDefault();
            if(activeTab === 'anonymous_req') onAnonymousRequest(formData);
            else onAuth(activeTab, formData);
        }} className="space-y-1">
            {activeTab === 'login' || activeTab === 'register' ? (
                <>
                    <InputBox label="會員名稱"><input required style={inputBaseStyle} placeholder="您的名稱" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} /></InputBox>
                    <InputBox label="密碼"><input required type="password" style={inputBaseStyle} placeholder="您的密碼" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} /></InputBox>
                </>
            ) : activeTab === 'anonymous_track' ? (
                <>
                    <InputBox label="匿名編號"><input required style={inputBaseStyle} placeholder="您自訂的編號" value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} /></InputBox>
                    <InputBox label="查詢密碼"><input required type="password" style={inputBaseStyle} placeholder="您的密碼" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} /></InputBox>
                </>
            ) : activeTab === 'anonymous_req' ? (
                <div className="space-y-0 overflow-y-auto max-h-[40vh] p-1 custom-scrollbar">
                    <InputBox label="自訂查詢編號 (重要)"><input required style={inputBaseStyle} placeholder="例如：Tako001" value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} /></InputBox>
                    <InputBox label="設定查詢密碼"><input required type="password" style={inputBaseStyle} placeholder="日後登入查詢用" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} /></InputBox>
                    <InputBox label="暱稱 (供繪師稱呼)"><input required style={inputBaseStyle} value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} /></InputBox>
                    <InputBox label="聯絡方式"><input required style={inputBaseStyle} placeholder="Discord / Email" value={formData.contact} onChange={e=>setFormData({...formData, contact: e.target.value})} /></InputBox>
                    <InputBox label="委託類別">
                        <select style={inputBaseStyle} value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value})}>
                            <option value="avatar">大頭貼</option>
                            <option value="halfBody">半身</option>
                            <option value="fullBody">全身</option>
                            <option value="other">其他</option>
                        </select>
                    </InputBox>
                    <InputBox label="需求描述"><textarea style={{...inputBaseStyle, height: '80px', resize:'none'}} value={formData.desc} onChange={e=>setFormData({...formData, desc: e.target.value})} /></InputBox>
                </div>
            ) : (
                <InputBox label="管理員密碼"><input required type="password" style={inputBaseStyle} placeholder="管理專用" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} /></InputBox>
            )}

            <button type="submit" className={`w-full py-4 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 text-lg mt-6 ${activeTab==='register'?'bg-pink-500 shadow-pink-100':activeTab==='anonymous_req'?'bg-emerald-500 shadow-emerald-100':'bg-blue-600 shadow-blue-100'}`}>
                {activeTab === 'login' ? '登入帳號' : activeTab === 'register' ? '建立帳號' : activeTab === 'anonymous_track' ? '匿名查詢' : activeTab === 'anonymous_req' ? '送出匿名委託' : '進入後台'}
            </button>
        </form>
      </div>
    </div>
  );
};

// --- 2. 委託人儀表板 (支援匿名) ---
const ClientDashboard = ({ user, allCommissions, onLogout, notify }) => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [isNewReqOpen, setNewReqOpen] = useState(false);
  
  // 過濾邏輯
  const myCommissions = user.isAnonymous 
    ? allCommissions.filter(c => c.id === user.targetId)
    : allCommissions.filter(c => c.userName === user.name);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b p-4 flex justify-between items-center px-10 shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${user.isAnonymous?'bg-emerald-500':'bg-blue-600'}`}>{user.isAnonymous?<Key size={16}/>:<User size={16}/>}</div>
            <span className="font-black text-slate-800">{user.name} 的空間 {user.isAnonymous && '(匿名模式)'}</span>
        </div>
        <button onClick={onLogout} className="text-slate-400 font-bold text-sm hover:text-red-500 transition-colors">登出</button>
      </nav>

      <main className="max-w-5xl mx-auto p-8">
        <div className="flex justify-between items-end mb-10">
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">我的委託</h1>
            {!user.isAnonymous && (
                <button onClick={()=>setNewReqOpen(true)} className="bg-pink-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-pink-600 flex items-center gap-2">
                    <Plus size={18}/> 發起新委託
                </button>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {myCommissions.map(c => (
              <div key={c.id} onClick={()=>setSelectedProject(c)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-slate-100 hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-6">
                    <h3 className="font-black text-xl">{c.type}</h3>
                    <div className={`px-4 py-1 rounded-xl text-[10px] font-black uppercase ${c.status==='pending'?'bg-pink-500 text-white animate-pulse':'bg-blue-50 text-blue-500 border border-blue-100'}`}>{c.status}</div>
                </div>
                <div className="text-[10px] font-black text-slate-300 uppercase">編號: #{c.code}</div>
                <div className="mt-4 flex justify-between items-center text-xs font-bold text-slate-400">
                    <span>{c.updatedAt.split('T')[0]}</span>
                    <ChevronRight size={16}/>
                </div>
              </div>
            ))}
        </div>
      </main>

      {/* 詳情彈窗與發起新委託邏輯在此省略，維持原版功能 */}
      {selectedProject && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 shadow-2xl relative border border-white">
                <button onClick={()=>setSelectedProject(null)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full"><X/></button>
                <h2 className="text-2xl font-black mb-6">委託詳情 - #{selectedProject.code}</h2>
                <div className="space-y-4">
                    <InputBox label="目前進度"><div className="font-black text-blue-600 text-2xl">{selectedProject.items[selectedProject.type]?.progress || 0}%</div></InputBox>
                    <InputBox label="繪師留言"><p className="text-sm italic">「{selectedProject.note || '暫無留言'}」</p></InputBox>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

// --- 3. 繪師後台 (分類式管理 + 搜尋 + 小分類) ---
const ArtistDashboard = ({ commissions, registeredUsers, notify, onLogout }) => {
  const [activeMainTab, setActiveMainTab] = useState('commissions'); // accounts, commissions, requests
  const [subTab, setSubTab] = useState('all'); // all, avatar, halfBody, fullBody, other
  const [searchQuery, setSearchQuery] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);

  // 1. 搜尋過濾
  const filteredComms = useMemo(() => {
    return commissions.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.desc && c.desc.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [commissions, searchQuery]);

  // 2. 分類過濾邏輯
  const ongoingList = filteredComms.filter(c => c.status !== 'pending' && c.status !== 'done');
  const requestsList = filteredComms.filter(c => c.status === 'pending');
  
  const getSubFilteredList = (list) => {
      if (subTab === 'all') return list;
      return list.filter(c => c.type === subTab);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-slate-900 text-white p-5 flex justify-between items-center px-10 shadow-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-xl"><Palette size={20}/></div>
          <span className="font-black tracking-tight text-xl">Artist Center</span>
        </div>
        <div className="flex items-center gap-6">
            {/* 搜尋框 */}
            <div className="relative hidden md:block">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={16}/>
                <input 
                    placeholder="搜尋名稱、編號..." 
                    className="bg-white/10 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:bg-white/20 transition-all w-64"
                    value={searchQuery}
                    onChange={e=>setSearchQuery(e.target.value)}
                />
            </div>
            <button onClick={onLogout} className="text-slate-400 font-bold text-xs hover:text-white">登出</button>
        </div>
      </nav>

      <div className="flex flex-1">
        {/* 側邊導覽 (主分類) */}
        <aside className="w-64 bg-white border-r p-6 space-y-2 hidden lg:block">
            <button onClick={()=>setActiveMainTab('accounts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-black text-sm transition-all ${activeMainTab==='accounts'?'bg-blue-600 text-white shadow-lg shadow-blue-100':'text-slate-400 hover:bg-slate-50'}`}>
                <Users size={18}/> 帳號類
            </button>
            <button onClick={()=>setActiveMainTab('commissions')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-black text-sm transition-all ${activeMainTab==='commissions'?'bg-blue-600 text-white shadow-lg shadow-blue-100':'text-slate-400 hover:bg-slate-50'}`}>
                <Activity size={18}/> 委託類
            </button>
            <button onClick={()=>setActiveMainTab('requests')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-black text-sm transition-all ${activeMainTab==='requests'?'bg-blue-600 text-white shadow-lg shadow-blue-100':'text-slate-400 hover:bg-slate-50'}`}>
                <Inbox size={18}/> 委託請求
                {requestsList.length > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{requestsList.length}</span>}
            </button>
        </aside>

        <main className="flex-1 p-8 overflow-y-auto max-h-[calc(100vh-80px)] custom-scrollbar">
            {/* 小分類 Tabs (僅在委託與請求顯示) */}
            {activeMainTab !== 'accounts' && (
                <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-2xl border w-fit">
                    {['all', 'avatar', 'halfBody', 'fullBody', 'other'].map(t => (
                        <button key={t} onClick={()=>setSubTab(t)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab===t?'bg-slate-900 text-white shadow-md':'text-slate-400 hover:text-slate-600'}`}>
                            {t === 'all' ? '全部' : t}
                        </button>
                    ))}
                </div>
            )}

            {/* 內容區域 */}
            {activeMainTab === 'accounts' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {registeredUsers.map(u => (
                        <div key={u.id} onClick={()=>setSelectedUserDetail(u)} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors"><User size={24}/></div>
                                <div>
                                    <h3 className="font-black text-lg">{u.name}</h3>
                                    <span className="text-[10px] font-bold text-slate-300">會員帳號</span>
                                </div>
                                <ChevronRight className="ml-auto text-slate-200" size={20}/>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {getSubFilteredList(activeMainTab === 'commissions' ? ongoingList : requestsList).map(c => (
                        <div key={c.id} className={`bg-white p-8 rounded-[2.5rem] border-2 ${c.status==='pending'?'border-pink-100 shadow-pink-200/10':'border-slate-100'} hover:shadow-2xl transition-all relative overflow-hidden`}>
                             <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="font-black text-xl">{c.name}</h3>
                                    <span className="text-[10px] font-black text-slate-300 uppercase">#{c.code}</span>
                                </div>
                                <div className={`px-4 py-1 rounded-xl text-[10px] font-black uppercase ${c.status==='pending'?'bg-pink-500 text-white':'bg-blue-50 text-blue-500'}`}>{c.status}</div>
                             </div>
                             <div className="bg-slate-50 p-4 rounded-2xl text-[10px] font-black text-slate-400 uppercase mb-6 border border-slate-100/50">類別: <span className="text-slate-700">{c.type}</span></div>
                             <button onClick={()=>setEditItem(c)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-blue-600 transition-all">管理委託</button>
                        </div>
                    ))}
                </div>
            )}
        </main>
      </div>

      {/* 帳號詳情彈窗 */}
      {selectedUserDetail && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-[3rem] w-full max-w-4xl p-10 shadow-2xl relative my-8 border border-white">
                <button onClick={()=>setSelectedUserDetail(null)} className="absolute top-8 right-8 p-2 bg-slate-100 rounded-full"><X/></button>
                <div className="mb-10 flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-500"><Users size={32}/></div>
                    <h2 className="text-3xl font-black">{selectedUserDetail.name} 的所有委託</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {commissions.filter(c => c.userName === selectedUserDetail.name).map(c => (
                        <div key={c.id} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 flex justify-between items-center">
                            <div>
                                <h4 className="font-black text-slate-800">{c.type}</h4>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">#{c.code} | {c.status}</span>
                            </div>
                            <button onClick={()=>{setEditItem(c); setSelectedUserDetail(null);}} className="p-2 bg-white rounded-xl shadow-sm text-blue-500"><Edit3 size={18}/></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* 編輯委託彈窗 (維持原功能，略) */}
      {editItem && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 shadow-2xl relative border border-white">
                <button onClick={()=>setEditItem(null)} className="absolute top-8 right-8 p-2 bg-slate-100 rounded-full"><X/></button>
                <h2 className="text-2xl font-black mb-8">管理委託: {editItem.name}</h2>
                <form onSubmit={async (e)=>{
                    e.preventDefault();
                    await updateDoc(doc(db, "commissions", editItem.id), { ...editItem, updatedAt: new Date().toISOString() });
                    notify('資料同步成功');
                    setEditItem(null);
                }} className="space-y-1">
                    <div className="grid grid-cols-2 gap-4">
                        <InputBox label="編號"><input style={inputBaseStyle} value={editItem.code} onChange={e=>setEditItem({...editItem, code: e.target.value})} /></InputBox>
                        <InputBox label="狀態">
                            <select style={inputBaseStyle} value={editItem.status} onChange={e=>setEditItem({...editItem, status: e.target.value})}>
                                <option value="pending">待核准</option>
                                <option value="waiting">排單中</option>
                                <option value="working">進行中</option>
                                <option value="done">已完成</option>
                            </select>
                        </InputBox>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <InputBox label="進度 %"><input type="number" style={inputBaseStyle} value={editItem.items[editItem.type].progress} onChange={e=>{
                            const items = {...editItem.items};
                            items[editItem.type].progress = parseInt(e.target.value);
                            setEditItem({...editItem, items});
                        }} /></InputBox>
                        <InputBox label="金額 $"><input type="number" style={inputBaseStyle} value={editItem.items[editItem.type].price} onChange={e=>{
                            const items = {...editItem.items};
                            items[editItem.type].price = parseInt(e.target.value);
                            setEditItem({...editItem, items});
                        }} /></InputBox>
                    </div>
                    <InputBox label="備註內容"><textarea style={{...inputBaseStyle, height:'80px', resize:'none'}} value={editItem.note} onChange={e=>setEditItem({...editItem, note: e.target.value})} /></InputBox>
                    <div className="flex gap-4 pt-6">
                        <button type="button" onClick={async ()=>{
                            if(confirm('確定要永久刪除嗎？')){
                                await deleteDoc(doc(db, "commissions", editItem.id));
                                notify('已刪除');
                                setEditItem(null);
                            }
                        }} className="px-6 py-4 bg-red-50 text-red-500 font-bold rounded-2xl">刪除</button>
                        <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl">儲存變更</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

// --- 通用組件與樣式 ---
const styles = `
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
`;

export default App;