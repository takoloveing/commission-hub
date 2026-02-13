import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Palette, User, Lock, LayoutGrid, CheckCircle2, 
  AlertCircle, Clock, Sparkles, LogOut, Plus, 
  Edit3, Trash2, MessageCircle, ChevronRight, 
  Save, X, Activity, Image as ImageIcon, DollarSign, CreditCard, 
  Wallet, ShieldCheck, Camera, History, FileText, Download, Cloud,
  Mail, Send, FileQuestion, Key, Settings, UserPlus, List, Search, Users, Inbox, Menu
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
    position: 'relative', 
    zIndex: 10,
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

// --- 新增：即時聊天框組件 ---
const ChatBox = ({ commissionId, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!commissionId) return;
    // 監聽該委託ID的訊息
    const q = query(
      collection(db, "messages"), 
      where("commissionId", "==", commissionId), 
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      // 自動捲動到底部
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsubscribe();
  }, [commissionId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    try {
        await addDoc(collection(db, "messages"), {
          commissionId,
          text: inputText,
          sender: currentUser.name,
          role: currentUser.role, // 'artist' or 'client'
          createdAt: new Date().toISOString()
        });
        setInputText('');
    } catch (error) {
        console.error("Error sending message: ", error);
        alert("訊息發送失敗");
    }
  };

  return (
    <InputBox label="專案討論室 (Chat)">
      <div className="bg-slate-50 border border-slate-200 rounded-2xl h-80 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                <MessageCircle size={32} />
                <p className="text-xs font-bold uppercase tracking-widest">尚無訊息，開始討論吧！</p>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.role === currentUser.role; // 判斷是否為自己發送
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-bold shadow-sm ${
                    isMe 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 font-black px-1">{msg.sender}</span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSend} className="p-2 bg-white border-t border-slate-100 flex gap-2">
          <input 
            className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none text-slate-700 placeholder:text-slate-300"
            placeholder="輸入訊息..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
          />
          <button type="submit" className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50" disabled={!inputText.trim()}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </InputBox>
  );
};

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
  const [view, setView] = useState('login'); 
  const [currentUser, setCurrentUser] = useState(null); 
  const [commissions, setCommissions] = useState([]); 
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [artistSettings, setArtistSettings] = useState({ password: 'admin' });
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

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
        setCurrentUser({ name: '管理員', role: 'artist' });
        setView('artist');
      } else showNotification('管理密碼錯誤', 'error');
      return;
    }

    if (action === 'anonymous_track') {
      const target = commissions.find(c => c.code === data.code && c.password === data.password);
      if (target) {
        setCurrentUser({ name: target.name, role: 'client', isAnonymous: true, targetId: target.id });
        setView('client');
      } else {
        showNotification('編號或查詢密碼錯誤', 'error');
      }
      return;
    }

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

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-500">雲端同步中...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <style>{styles}</style>
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[999] px-6 py-3 rounded-2xl shadow-2xl border ${notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'} flex items-center gap-3 animate-in slide-in-from-top-4 backdrop-blur-md`}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span className="font-bold">{notification.msg}</span>
        </div>
      )}

      {view === 'login' && <LoginView onAuth={handleAuth} onAnonymousRequest={async (d) => {
        try {
          const newItem = { 
            ...d, 
            status: 'pending', 
            updatedAt: new Date().toISOString(), 
            isAnonymous: true, 
            items: { 
              avatar: { active: d.type==='avatar', progress: 0, price: 0, payment: 'none' }, 
              halfBody: { active: d.type==='halfBody', progress: 0, price: 0, payment: 'none' }, 
              fullBody: { active: d.type==='fullBody', progress: 0, price: 0, payment: 'none' }, 
              other: { active: d.type==='other', progress: 0, price: 0, payment: 'none' } 
            }, 
            timeline: [{ date: new Date().toISOString().split('T')[0], title: '匿名委託', desc: '已提交請求，編號：' + d.code }] 
          };
          await addDoc(collection(db, "commissions"), newItem);
          showNotification('申請已送出！請記住編號：' + d.code);
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

// --- 1. 登入介面 ---
const LoginView = ({ onAuth, onAnonymousRequest }) => {
  const [activeTab, setActiveTab] = useState('login'); 
  const [formData, setFormData] = useState({ name: '', password: '', code: '', contact: '', type: 'avatar', desc: '' });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-blue-50 relative">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[100px] animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-sky-300/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 border border-slate-200 relative z-10">
        <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-xl rotate-2"><Palette size={32}/></div>
            <h1 className="text-2xl font-black">Commission<span className="text-blue-500">Hub</span></h1>
        </div>

        <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-8 overflow-x-auto no-scrollbar gap-1">
            {['login', 'register', 'anonymous_track', 'anonymous_req', 'artist'].map(tab => (
              <button key={tab} onClick={()=>setActiveTab(tab)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap px-4 ${activeTab===tab?'bg-white text-blue-600 shadow-sm':'text-slate-400'}`}>
                {tab === 'login' ? '登入' : tab === 'register' ? '註冊' : tab === 'anonymous_track' ? '匿名查詢' : tab === 'anonymous_req' ? '匿名委託' : '繪師端'}
              </button>
            ))}
        </div>

        <form onSubmit={(e)=>{
            e.preventDefault();
            if(activeTab === 'anonymous_req') onAnonymousRequest(formData);
            else onAuth(activeTab, formData);
        }} className="space-y-1 relative z-20"> 
            {(activeTab === 'login' || activeTab === 'register') && (
                <>
                    <InputBox label="會員名稱"><input required style={inputBaseStyle} placeholder="您的名稱" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} /></InputBox>
                    <InputBox label="密碼"><input required type="password" style={inputBaseStyle} placeholder="您的密碼" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} /></InputBox>
                </>
            )}
            {activeTab === 'anonymous_track' && (
                <>
                    <InputBox label="匿名編號"><input required style={inputBaseStyle} placeholder="您當初設定的編號" value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} /></InputBox>
                    <InputBox label="查詢密碼"><input required type="password" style={inputBaseStyle} placeholder="您的密碼" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} /></InputBox>
                </>
            )}
            {activeTab === 'anonymous_req' && (
                <div className="space-y-0 overflow-y-auto max-h-[45vh] p-1 custom-scrollbar">
                    <InputBox label="自訂查詢編號 (重要)"><input required style={inputBaseStyle} placeholder="例如：Tako001" value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} /></InputBox>
                    <InputBox label="設定查詢密碼"><input required type="password" style={inputBaseStyle} placeholder="日後登入查詢用" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} /></InputBox>
                    <InputBox label="您的暱稱"><input required style={inputBaseStyle} value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} /></InputBox>
                    <InputBox label="聯絡方式"><input required style={inputBaseStyle} placeholder="Discord / Email" value={formData.contact} onChange={e=>setFormData({...formData, contact: e.target.value})} /></InputBox>
                    <InputBox label="委託類別">
                        <select style={inputBaseStyle} value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value})}>
                            <option value="avatar">大頭貼</option>
                            <option value="halfBody">半身</option>
                            <option value="fullBody">全身立繪</option>
                            <option value="other">其他</option>
                        </select>
                    </InputBox>
                    <InputBox label="需求描述"><textarea style={{...inputBaseStyle, height: '80px', resize:'none'}} value={formData.desc} onChange={e=>setFormData({...formData, desc: e.target.value})} /></InputBox>
                </div>
            )}
            {activeTab === 'artist' && (
                <InputBox label="繪師管理密碼"><input required type="password" style={inputBaseStyle} placeholder="管理專用" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} /></InputBox>
            )}

            <button type="submit" className={`w-full py-4 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 text-lg mt-6 relative z-20 ${activeTab==='register'?'bg-pink-500 shadow-pink-100':activeTab==='anonymous_req'?'bg-emerald-500 shadow-emerald-100':'bg-blue-600 shadow-blue-100'}`}>
                {activeTab === 'login' ? '登入帳號' : activeTab === 'register' ? '建立帳號' : activeTab === 'anonymous_track' ? '匿名查詢' : activeTab === 'anonymous_req' ? '送出請求' : '進入後台'}
            </button>
        </form>
      </div>
    </div>
  );
};

// --- 2. 委託人儀表板 ---
const ClientDashboard = ({ user, allCommissions, onLogout, notify }) => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [isNewReqOpen, setNewReqOpen] = useState(false);
  
  const myCommissions = user.isAnonymous 
    ? allCommissions.filter(c => c.id === user.targetId)
    : allCommissions.filter(c => c.userName === user.name);

  const handleNewRequest = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    
    try {
      const newItem = {
        userName: user.name,
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
            fullBody: { active: data.type==='fullBody', progress: 0, price: 0, payment: 'none' },
            other: { active: data.type==='other', progress: 0, price: 0, payment: 'none' } 
        },
        timeline: [{ date: new Date().toISOString().split('T')[0], title: '申請成功', desc: '已提交新委託請求' }]
      };
      await addDoc(collection(db, "commissions"), newItem);
      notify('委託申請已送出！');
      setNewReqOpen(false);
    } catch(err) { notify('發送失敗', 'error'); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b p-4 flex justify-between items-center px-6 lg:px-10 shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${user.isAnonymous?'bg-emerald-500':'bg-blue-600'}`}>{user.isAnonymous?<Key size={16}/>:<User size={16}/>}</div>
            <span className="font-black text-slate-800 text-sm md:text-base">{user.name} 的空間</span>
        </div>
        <button onClick={onLogout} className="text-slate-400 font-bold text-sm hover:text-red-500 transition-colors">登出</button>
      </nav>

      <main className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
            <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">我的委託</h1>
            {!user.isAnonymous && (
                <button onClick={()=>setNewReqOpen(true)} className="w-full md:w-auto bg-pink-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-pink-600 flex items-center justify-center gap-2 relative z-10">
                    <Plus size={18}/> 新委託
                </button>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 pb-20">
            {myCommissions.map(c => (
              <div key={c.id} onClick={()=>setSelectedProject(c)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-slate-100 hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-6">
                    <h3 className="font-black text-xl capitalize">{c.type}</h3>
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

      {/* 委託詳情彈窗 */}
      {selectedProject && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 shadow-2xl relative border border-white my-8">
                <button onClick={()=>setSelectedProject(null)} className="absolute top-6 right-8 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-all"><X/></button>
                <h2 className="text-3xl font-black mb-6">委託詳情 - #{selectedProject.code}</h2>
                <div className="space-y-4">
                    <InputBox label="目前進度">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{width: `${selectedProject.items[selectedProject.type]?.progress || 0}%`}}></div>
                        </div>
                        <span className="font-black text-blue-600">{selectedProject.items[selectedProject.type]?.progress || 0}%</span>
                      </div>
                    </InputBox>
                    <InputBox label="委託金額">
                      <div className="font-black text-2xl">${selectedProject.items[selectedProject.type]?.price || 0}</div>
                    </InputBox>
                    <InputBox label="繪師留言"><p className="text-sm italic text-slate-600">「{selectedProject.note || '繪師尚未留下訊息。'}」</p></InputBox>
                    
                    {/* 即時聊天框：插入在詳情下方 */}
                    <ChatBox commissionId={selectedProject.id} currentUser={user} />
                </div>
            </div>
        </div>
      )}

      {/* 新增委託彈窗 */}
      {isNewReqOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl border border-white my-8">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-black flex items-center gap-3"><Mail className="text-pink-500"/> 發起新委託</h2>
              <button onClick={()=>setNewReqOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-all"><X size={20}/></button>
            </div>
            <form onSubmit={handleNewRequest} className="space-y-2">
               <InputBox label="聯絡方式"><input name="contact" required style={inputBaseStyle} placeholder="Discord ID / Email" /></InputBox>
               <InputBox label="委託類別">
                  <select name="type" style={inputBaseStyle} className="cursor-pointer">
                    <option value="avatar">大頭貼</option>
                    <option value="halfBody">半身插畫</option>
                    <option value="fullBody">全身立繪</option>
                    <option value="other">其他</option>
                  </select>
               </InputBox>
               <InputBox label="需求細節描述"><textarea name="desc" placeholder="請描述您的角色或需求..." style={{...inputBaseStyle, height: '120px', resize: 'none'}} /></InputBox>
               <button type="submit" className="w-full py-5 bg-pink-500 text-white font-black rounded-2xl shadow-xl hover:bg-pink-600 mt-6">送出請求</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 3. 繪師後台 ---
const ArtistDashboard = ({ commissions, registeredUsers, notify, onLogout }) => {
  const [activeMainTab, setActiveMainTab] = useState('commissions'); 
  const [subTab, setSubTab] = useState('all'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);

  const filteredAll = useMemo(() => {
    return commissions.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.userName && c.userName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [commissions, searchQuery]);

  const requestsList = filteredAll.filter(c => c.status === 'pending');
  const ongoingList = filteredAll.filter(c => c.status !== 'pending' && c.status !== 'done');
  
  const getSubFiltered = (list) => subTab === 'all' ? list : list.filter(c => c.type === subTab);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-slate-900 text-white p-5 flex justify-between items-center px-6 lg:px-10 shadow-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-xl shadow-lg"><Palette size={20}/></div>
          <span className="font-black tracking-tight text-lg lg:text-xl">Artist Center</span>
        </div>
        <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={16}/>
                <input 
                    placeholder="搜尋名稱、編號..." 
                    className="bg-white/10 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:bg-white/20 transition-all w-64 text-white"
                    value={searchQuery}
                    onChange={e=>setSearchQuery(e.target.value)}
                />
            </div>
            <button onClick={onLogout} className="text-slate-400 font-bold text-xs hover:text-white px-3 py-2 bg-white/5 rounded-lg">登出</button>
        </div>
      </nav>

      {/* 手機版搜尋框 (放在導航下方) */}
      <div className="md:hidden p-4 bg-slate-900 border-t border-slate-800">
         <input 
            placeholder="搜尋..." 
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none text-white"
            value={searchQuery}
            onChange={e=>setSearchQuery(e.target.value)}
         />
      </div>

      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* 電腦版側邊欄 */}
        <aside className="w-64 bg-white border-r p-6 space-y-2 hidden lg:flex flex-col shrink-0">
            <NavButtons activeMainTab={activeMainTab} setActiveMainTab={setActiveMainTab} requestsCount={requestsList.length} />
        </aside>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto custom-scrollbar">
            {/* 手機版頂部導航 (取代側邊欄) */}
            <div className="lg:hidden mb-6 overflow-x-auto pb-2 no-scrollbar">
                <div className="flex gap-2 min-w-max">
                    <NavButtons activeMainTab={activeMainTab} setActiveMainTab={setActiveMainTab} requestsCount={requestsList.length} mobile />
                </div>
            </div>

            {activeMainTab !== 'accounts' && (
                <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-2xl border w-fit shadow-sm overflow-x-auto max-w-full">
                    {['all', 'avatar', 'halfBody', 'fullBody', 'other'].map(t => (
                        <button key={t} onClick={()=>setSubTab(t)} className={`px-4 lg:px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${subTab===t?'bg-slate-900 text-white':'text-slate-400 hover:text-slate-600'}`}>
                            {t === 'all' ? '全部' : t}
                        </button>
                    ))}
                </div>
            )}

            {activeMainTab === 'accounts' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                    {registeredUsers.map(u => (
                        <div key={u.id} onClick={()=>setSelectedUserDetail(u)} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors"><User size={24}/></div>
                            <div>
                                <h3 className="font-black text-lg">{u.name}</h3>
                                <span className="text-[10px] font-bold text-slate-300">會員帳號</span>
                            </div>
                            <ChevronRight className="ml-auto text-slate-200" size={20}/>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                    {getSubFiltered(activeMainTab === 'commissions' ? ongoingList : requestsList).map(c => (
                        <div key={c.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all relative">
                             <div className="flex justify-between items-start mb-6">
                                <div><h3 className="font-black text-xl">{c.name}</h3><span className="text-[10px] font-black text-slate-300">#{c.code}</span></div>
                                <div className={`px-4 py-1 rounded-xl text-[10px] font-black uppercase ${c.status==='pending'?'bg-pink-500 text-white':'bg-blue-50 text-blue-500'}`}>{c.status}</div>
                             </div>
                             <div className="text-[10px] font-black text-slate-400 uppercase mb-6 bg-slate-50 p-3 rounded-xl border">類別: <span className="text-slate-800">{c.type}</span></div>
                             <button onClick={()=>setEditItem(c)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-blue-600 transition-all">管理詳情</button>
                        </div>
                    ))}
                </div>
            )}
        </main>
      </div>

      {/* 編輯委託彈窗 (繪師用) */}
      {editItem && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 shadow-2xl relative border border-white my-8">
                <button onClick={()=>setEditItem(null)} className="absolute top-8 right-8 p-2 bg-slate-100 rounded-full"><X/></button>
                <h2 className="text-2xl font-black mb-8 text-slate-800">編輯委託：#{editItem.code}</h2>
                <form onSubmit={async (e)=>{
                    e.preventDefault();
                    await updateDoc(doc(db, "commissions", editItem.id), { ...editItem, updatedAt: new Date().toISOString() });
                    notify('雲端同步成功');
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
                        <InputBox label="進度 %"><input type="number" style={inputBaseStyle} value={editItem.items[editItem.type]?.progress || 0} onChange={e=>{
                            const items = {...editItem.items};
                            if(!items[editItem.type]) items[editItem.type] = {active: true, progress: 0, price: 0};
                            items[editItem.type].progress = parseInt(e.target.value);
                            setEditItem({...editItem, items});
                        }} /></InputBox>
                        <InputBox label="金額 $"><input type="number" style={inputBaseStyle} value={editItem.items[editItem.type]?.price || 0} onChange={e=>{
                            const items = {...editItem.items};
                            if(!items[editItem.type]) items[editItem.type] = {active: true, progress: 0, price: 0};
                            items[editItem.type].price = parseInt(e.target.value);
                            setEditItem({...editItem, items});
                        }} /></InputBox>
                    </div>
                    <InputBox label="留言備註"><textarea style={{...inputBaseStyle, height:'100px', resize:'none'}} value={editItem.note} onChange={e=>setEditItem({...editItem, note: e.target.value})} /></InputBox>
                    
                    {/* 即時聊天框：繪師端 */}
                    <ChatBox commissionId={editItem.id} currentUser={{ name: '繪師', role: 'artist' }} />

                    <div className="flex gap-4 pt-6">
                        <button type="button" onClick={async ()=>{
                            if(confirm('警告：確定要刪除嗎？')){
                                await deleteDoc(doc(db, "commissions", editItem.id));
                                notify('已刪除');
                                setEditItem(null);
                            }
                        }} className="px-6 py-4 bg-red-50 text-red-500 font-bold rounded-2xl">刪除</button>
                        <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl">儲存並同步</button>
                    </div>
                </form>
            </div>
        </div>
      )}
      
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
    </div>
  );
};

// 抽離的導航按鈕組件，方便同時用於側邊欄和手機版
const NavButtons = ({ activeMainTab, setActiveMainTab, requestsCount, mobile }) => (
    <>
        <button onClick={()=>setActiveMainTab('accounts')} className={`${mobile ? 'px-6 py-2 rounded-xl text-xs whitespace-nowrap' : 'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm'} font-black transition-all ${activeMainTab==='accounts'?'bg-blue-600 text-white shadow-lg':'text-slate-400 hover:bg-slate-50'}`}>
            {!mobile && <Users size={18}/>} 帳號類
        </button>
        <button onClick={()=>setActiveMainTab('commissions')} className={`${mobile ? 'px-6 py-2 rounded-xl text-xs whitespace-nowrap' : 'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm'} font-black transition-all ${activeMainTab==='commissions'?'bg-blue-600 text-white shadow-lg':'text-slate-400 hover:bg-slate-50'}`}>
            {!mobile && <Activity size={18}/>} 委託類
        </button>
        <button onClick={()=>setActiveMainTab('requests')} className={`${mobile ? 'px-6 py-2 rounded-xl text-xs whitespace-nowrap' : 'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm'} font-black transition-all ${activeMainTab==='requests'?'bg-blue-600 text-white shadow-lg':'text-slate-400 hover:bg-slate-50'}`}>
            {!mobile && <Inbox size={18}/>} 委託請求
            {requestsCount > 0 && <span className={`ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full ${mobile && 'ml-2'}`}>{requestsCount}</span>}
        </button>
    </>
);

const styles = `
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
`;

export default App;