import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Palette, User, Lock, LayoutGrid, CheckCircle2, 
  AlertCircle, Clock, Sparkles, LogOut, Plus, 
  Edit3, Trash2, MessageCircle, ChevronRight, 
  Save, X, Activity, Image as ImageIcon, DollarSign, CreditCard, 
  Wallet, ShieldCheck, Camera, History, FileText, Download, Cloud,
  Mail, Send, FileQuestion, Key, Settings, UserPlus, List, Search, Users, Inbox, Menu, ShieldAlert,
  MessageSquare, ArrowLeft, Paperclip, Loader2, Link, UploadCloud, Banknote, Gift, Filter, ArrowDownUp, Calendar, Type, Ban,
  BarChart3, Copy, Eye, Power
} from 'lucide-react';

// --- Firebase 標準引入 ---
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, 
  doc, onSnapshot, query, orderBy, setDoc, getDoc, where 
} from 'firebase/firestore';
import { 
  getStorage, ref, uploadBytes, getDownloadURL 
} from 'firebase/storage';

// ⚠️ 請確認這是您正確的 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCeHj5Kc6E_ltyXboL7cWSpFClq4FrCrvU",
  authDomain: "commission-hub-cc739.firebaseapp.com",
  projectId: "commission-hub-cc739",
  storageBucket: "commission-hub-cc739.firebasestorage.app",
  messagingSenderId: "1022991297741",
  appId: "1:1022991297741:web:df716fcd268c0d9d2c8d84"
};

// 初始化 Firebase
let firebaseApp;
let db;
let storage;

try {
  firebaseApp = initializeApp(firebaseConfig);
  db = getFirestore(firebaseApp);
  storage = getStorage(firebaseApp);
} catch (error) {
  console.error("Firebase Init Error:", error);
}

// --- 預設範例圖 ---
const DEFAULT_EXAMPLE_IMAGES = {
  avatar: ["https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400","https://images.unsplash.com/photo-1554151228-14d9def656ec?w=400"],
  halfBody: ["https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400","https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400"],
  fullBody: ["https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400","https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400"],
  other: ["https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500","https://images.unsplash.com/photo-1620641788427-b11a684e925c?w=500"]
};

// --- 圖片壓縮/上傳工具 ---
const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 1000; 
        if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
        else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const uploadImageToStorage = async (file) => {
  if (!storage) throw new Error("Storage 尚未啟用");
  const storageRef = ref(storage, `images/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};

const smartUpload = async (file) => {
    if (typeof file === 'string') return file;
    if (!file) return null;
    try {
        return await uploadImageToStorage(file);
    } catch (e) {
        console.warn("Fallback to compression", e);
        return await compressImage(file);
    }
}

// --- 樣式組件 ---
const InputBox = ({ label, children, style = {} }) => (
  <div style={{
    backgroundColor: '#ffffff',
    border: '2px solid #cbd5e1',
    borderRadius: '12px',
    padding: '12px 14px',
    marginBottom: '14px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
    position: 'relative', 
    zIndex: 10,
    ...style
  }} className="md:rounded-2xl md:p-4 md:mb-4">
    <label style={{
      fontSize: '10px',
      fontWeight: '900',
      color: '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: '4px'
    }} className="md:text-xs md:tracking-widest">{label}</label>
    {children}
  </div>
);

const inputBaseStyle = { width: '100%', padding: '2px 0', backgroundColor: 'transparent', border: 'none', outline: 'none', fontWeight: '700', fontSize: '14px', color: '#1e293b' };

const getStatusStyle = (status) => {
    switch (status) {
        case 'pending': return 'bg-pink-500 text-white animate-pulse';
        case 'declined': return 'bg-slate-200 text-slate-500 border border-slate-300';
        case 'done': return 'bg-emerald-500 text-white';
        default: return 'bg-blue-50 text-blue-500 border border-blue-100';
    }
};

const getStatusLabel = (status) => {
    switch (status) {
        case 'pending': return '待核准';
        case 'waiting': return '排單中';
        case 'working': return '進行中';
        case 'done': return '已完成';
        case 'declined': return '已婉拒';
        default: return status || '未知';
    }
};

// --- ChatRoom ---
const ChatRoom = ({ commissionId, currentUser, heightClass = "h-64 md:h-80", status }) => { 
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false); 
  const [previewImage, setPreviewImage] = useState(null); 
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!commissionId || !db) return;
    const q = query(collection(db, "messages"), where("commissionId", "==", commissionId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      msgs.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsubscribe();
  }, [commissionId]);

  const handleSend = async (e) => {
    if (e) e.preventDefault(); 
    if (!inputText.trim()) return;
    try {
        await addDoc(collection(db, "messages"), {
          commissionId,
          text: inputText,
          sender: currentUser.name,
          role: currentUser.role,
          createdAt: new Date().toISOString(),
          type: 'text'
        });
        setInputText('');
    } catch (error) { console.error(error); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true); 
    try {
      const imageUrl = await smartUpload(file);
      await addDoc(collection(db, "messages"), {
        commissionId,
        image: imageUrl, 
        sender: currentUser.name,
        role: currentUser.role,
        createdAt: new Date().toISOString(),
        type: 'image'
      });
    } catch (error) { alert("圖片上傳失敗"); } finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = null; }
  };

  return (
    <div className={`flex flex-col bg-slate-50 relative ${heightClass} rounded-xl md:rounded-2xl overflow-hidden border border-slate-200`}>
        {previewImage && (<div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setPreviewImage(null)}><button className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all"><X size={32} /></button><img src={previewImage} alt="Full Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-default" onClick={(e) => e.stopPropagation()} /></div>)}
        {isUploading && (<div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center text-blue-600 backdrop-blur-sm"><Loader2 size={32} className="animate-spin mb-2" /><p className="text-xs font-black uppercase tracking-widest">Uploading...</p></div>)}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-slate-50/50">
          {messages.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 opacity-50"><MessageCircle size={32} strokeWidth={1.5} /><p className="text-[10px] font-bold uppercase tracking-widest">開始討論吧！</p></div>) : (messages.map(msg => { const isMe = msg.role === currentUser.role; return (<div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>{msg.type === 'image' ? (<div className={`p-1 rounded-2xl border-2 shadow-sm ${isMe ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}><img src={msg.image} alt="sent" className="max-w-[120px] md:max-w-[200px] max-h-[150px] md:max-h-[300px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setPreviewImage(msg.image)} /></div>) : (<div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs md:text-sm font-bold shadow-sm break-words ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'}`}>{msg.text}</div>)}<span className="text-[9px] text-slate-400 mt-1 font-bold px-1 opacity-70">{msg.sender}</span></div>); }))}
          <div ref={messagesEndRef} />
        </div>
        {status === 'declined' ? (<div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold gap-2"><Ban size={16} /> 🚫 此委託已婉拒，討論功能關閉</div>) : (<div className="p-2 bg-white border-t border-slate-100 flex gap-2 shrink-0 items-end"><input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} /><button type="button" onClick={() => fileInputRef.current.click()} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 hover:text-slate-700 transition-all active:scale-95" disabled={isUploading}><ImageIcon size={18} /></button><div className="flex-1 relative"><input className="w-full bg-slate-100 border-none rounded-xl pl-3 pr-3 py-2 text-xs md:text-sm font-bold outline-none text-slate-700 placeholder:text-slate-400 transition-all focus:bg-white focus:ring-2 focus:ring-blue-100" placeholder="輸入訊息..." value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }} /></div><button type="button" onClick={handleSend} className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none active:scale-95" disabled={!inputText.trim() || isUploading}><Send size={18} /></button></div>)}
    </div>
  );
};

// --- Messenger ---
const Messenger = ({ commissions, currentUser }) => {
  const [selectedCommId, setSelectedCommId] = useState(null);
  const selectedCommission = commissions.find(c => c.id === selectedCommId);

  return (
    <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden flex relative">
      <div className={`w-full md:w-80 bg-slate-50 border-r border-slate-100 flex flex-col ${selectedCommId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 md:p-6 border-b border-slate-200/50 bg-white/50 backdrop-blur-sm sticky top-0 z-10"><h2 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2"><MessageSquare className="text-blue-500"/> 聊天列表</h2></div>
        <div className="overflow-y-auto flex-1 p-2 md:p-3 space-y-2 custom-scrollbar">
            {commissions.length > 0 ? commissions.map(c => (<button key={c.id} onClick={() => setSelectedCommId(c.id)} className={`w-full text-left p-3 md:p-4 rounded-xl md:rounded-2xl transition-all border-2 group relative overflow-hidden ${selectedCommId === c.id ? 'bg-white border-blue-500 shadow-md' : 'bg-white border-transparent hover:border-blue-200 hover:shadow-sm'}`}><div className="flex justify-between items-start mb-1"><span className={`font-black text-xs md:text-sm ${selectedCommId === c.id ? 'text-blue-600' : 'text-slate-700'}`}>{currentUser.role === 'artist' ? c.name || '未知' : '繪師'}</span><span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">#{c.code || '無編號'}</span></div><div className="text-[10px] md:text-xs font-bold text-slate-400 truncate">{c.type || '未知類別'} • {getStatusLabel(c.status)}</div></button>)) : (<div className="text-center p-8 text-slate-400 text-xs font-bold">沒有進行中的對話</div>)}
        </div>
      </div>
      <div className={`flex-1 flex flex-col bg-white ${!selectedCommId ? 'hidden md:flex' : 'flex'} w-full md:w-auto absolute md:relative inset-0 md:inset-auto z-20`}>
        {selectedCommission ? (<><div className="p-3 md:p-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-30 shadow-sm"><div className="flex items-center gap-3"><button onClick={() => setSelectedCommId(null)} className="md:hidden p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft size={20}/></button><div><h3 className="font-black text-slate-800 text-sm md:text-base">{currentUser.role === 'artist' ? selectedCommission.name || '未知' : '繪師'} <span className="text-slate-400 font-bold ml-2 text-xs">#{selectedCommission.code}</span></h3><span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{selectedCommission.type}</span></div></div></div><div className="flex-1 overflow-hidden relative"><ChatRoom commissionId={selectedCommId} currentUser={currentUser} heightClass="h-full border-none rounded-none" status={selectedCommission.status} /></div></>) : (<div className="hidden md:flex flex-col items-center justify-center h-full text-slate-300 gap-4"><div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center"><MessageSquare size={24} /></div><p className="font-black text-xs uppercase tracking-widest">請從左側選擇一個對話</p></div>)}
      </div>
    </div>
  );
};

// --- ArtistStats ---
const ArtistStats = ({ commissions }) => {
    const stats = useMemo(() => {
        const pending = commissions.filter(c => c.status === 'pending').length;
        const working = commissions.filter(c => ['waiting', 'working'].includes(c.status)).length;
        const done = commissions.filter(c => c.status === 'done').length;
        // 安全檢查: 確保 items 和 price 存在
        const earnings = commissions.filter(c => c.status !== 'declined' && c.status !== 'pending' && c.paymentType !== 'free').reduce((acc, curr) => acc + (parseInt(curr.items?.[curr.type]?.price || 0)), 0);
        return { pending, working, done, earnings };
    }, [commissions]);
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center"><div className="w-10 h-10 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center mb-2"><FileQuestion size={20}/></div><span className="text-2xl font-black text-slate-800">{stats.pending}</span><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">待審核</span></div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center"><div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-2"><Activity size={20}/></div><span className="text-2xl font-black text-slate-800">{stats.working}</span><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">進行中</span></div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center"><div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-2"><CheckCircle2 size={20}/></div><span className="text-2xl font-black text-slate-800">{stats.done}</span><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">已完成</span></div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center"><div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-2"><DollarSign size={20}/></div><span className="text-xl md:text-2xl font-black text-slate-800">${stats.earnings.toLocaleString()}</span><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">預估收益</span></div>
        </div>
    );
};

// --- App ---
const App = () => {
  const [view, setView] = useState('login'); 
  const [currentUser, setCurrentUser] = useState(null); 
  const [commissions, setCommissions] = useState([]); 
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [artistSettings, setArtistSettings] = useState({ 
      password: 'admin', 
      paymentInfo: '', 
      tos: '尚無服務條款', 
      isOpen: true,
      exampleImages: DEFAULT_EXAMPLE_IMAGES 
  }); 
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const unsubComms = onSnapshot(query(collection(db, "commissions"), orderBy("updatedAt", "desc")), (snapshot) => {
      setCommissions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setRegisteredUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      setLoading(false);
    });
    const unsubSettings = onSnapshot(doc(db, "settings", "admin_config"), (docSnap) => {
      if (docSnap.exists()) {
          const data = docSnap.data();
          setArtistSettings({ ...data, exampleImages: data.exampleImages || DEFAULT_EXAMPLE_IMAGES });
      } else {
          setDoc(doc(db, "settings", "admin_config"), { password: 'admin', paymentInfo: '', tos: '', isOpen: true, exampleImages: DEFAULT_EXAMPLE_IMAGES });
      }
    });
    return () => { unsubComms(); unsubUsers(); unsubSettings(); };
  }, []);

  const showNotification = (msg, type = 'success') => { setNotification({ msg, type }); setTimeout(() => setNotification(null), 3000); };
  const handleAuth = async (action, data) => {
    if (action === 'artist') { if (data.password === artistSettings.password) { setCurrentUser({ name: '管理員', role: 'artist' }); setView('artist'); } else showNotification('管理密碼錯誤', 'error'); return; }
    if (action === 'anonymous_track') { const target = commissions.find(c => c.code === data.code && c.password === data.password); if (target) { setCurrentUser({ name: target.name || '匿名用戶', role: 'client', isAnonymous: true, code: data.code }); setView('client'); } else showNotification('編號或查詢密碼錯誤，或尚無此委託', 'error'); return; }
    if (action === 'forgot_password') { const userRef = doc(db, "users", data.name); const userSnap = await getDoc(userRef); if (!userSnap.exists()) { showNotification('查無此會員名稱', 'error'); return; } const validCommission = commissions.find(c => c.userName === data.name && c.code === data.code); if (validCommission) { showNotification('身分驗證成功！請立即重設密碼'); setCurrentUser({ name: data.name, role: 'client', mustResetPassword: true }); setView('client'); } else showNotification('驗證失敗', 'error'); return; }
    const userRef = doc(db, "users", data.name); const userSnap = await getDoc(userRef);
    if (action === 'register') { if (userSnap.exists()) showNotification('名稱已被註冊，請換一個', 'error'); else { await setDoc(userRef, { name: data.name, password: data.password }); showNotification('註冊成功'); setCurrentUser({ name: data.name, role: 'client', isAnonymous: false }); setView('client'); } } 
    else if (action === 'login') { if (userSnap.exists() && userSnap.data().password === data.password) { setCurrentUser({ name: data.name, role: 'client', isAnonymous: false }); setView('client'); } else showNotification('名稱或密碼錯誤', 'error'); }
  };
  const handleForceReset = async (newPassword) => { try { await updateDoc(doc(db, "users", currentUser.name), { password: newPassword }); showNotification('密碼重設成功！'); setCurrentUser({ ...currentUser, mustResetPassword: false }); } catch (e) { showNotification('重設失敗', 'error'); } };
  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-500">雲端同步中...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <style>{styles}</style>
      {notification && (<div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[999] px-6 py-3 rounded-2xl shadow-2xl border ${notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'} flex items-center gap-3 animate-in slide-in-from-top-4 backdrop-blur-md`}>{notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}<span className="font-bold">{notification.msg}</span></div>)}
      {currentUser?.mustResetPassword && (<div className="fixed inset-0 bg-slate-900/90 z-[1000] flex items-center justify-center p-4"><div className="bg-white rounded-[2rem] w-full max-w-md p-6 md:p-10 shadow-2xl border-4 border-red-100"><div className="text-center mb-8"><div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce"><ShieldAlert size={32}/></div><h2 className="text-xl md:text-2xl font-black text-slate-800">安全警示：強制重設</h2><p className="text-slate-500 text-xs md:text-sm mt-2 font-bold">您透過救援編號登入，為確保帳號安全，<br/>請立即設定新的登入密碼。</p></div><form onSubmit={(e) => { e.preventDefault(); handleForceReset(e.target.newPwd.value); }} className="space-y-2"><InputBox label="設定新密碼"><input name="newPwd" type="password" autoComplete="new-password" required style={inputBaseStyle} placeholder="請輸入新密碼" /></InputBox><button type="submit" className="w-full py-3 md:py-4 bg-red-500 text-white font-black rounded-xl md:rounded-2xl shadow-xl hover:bg-red-600 transition-all mt-4">確認並更新密碼</button></form></div></div>)}
      {view === 'login' && <LoginView onAuth={handleAuth} isCommissionOpen={artistSettings.isOpen} onAnonymousRequest={async (d) => { try { const result = await smartUpload(d.referenceImages?.[0] || null); const newItem = { ...d, status: 'pending', updatedAt: new Date().toISOString(), isAnonymous: true, paymentType: d.paymentType || 'paid', referenceImages: d.referenceImages || [], referenceImage: d.referenceImages?.[0] || '', items: { avatar: { active: d.type==='avatar', progress: 0, price: 0, payment: 'none' }, halfBody: { active: d.type==='halfBody', progress: 0, price: 0, payment: 'none' }, fullBody: { active: d.type==='fullBody', progress: 0, price: 0, payment: 'none' }, other: { active: d.type==='other', progress: 0, price: 0, payment: 'none' } }, timeline: [{ date: new Date().toISOString().split('T')[0], title: '匿名委託', desc: '已提交請求，編號：' + d.code }] }; await addDoc(collection(db, "commissions"), newItem); showNotification('申請已送出！請記住編號：' + d.code); } catch(e) { showNotification(e.message, 'error'); } }} tos={artistSettings.tos} exampleImages={artistSettings.exampleImages} />}
      {view === 'client' && <ClientDashboard user={currentUser} allCommissions={commissions} artistPaymentInfo={artistSettings.paymentInfo} isCommissionOpen={artistSettings.isOpen} tos={artistSettings.tos} exampleImages={artistSettings.exampleImages} onLogout={() => { setView('login'); setCurrentUser(null); }} notify={showNotification} />}
      {view === 'artist' && <ArtistDashboard commissions={commissions} registeredUsers={registeredUsers} artistSettings={artistSettings} notify={showNotification} onLogout={() => { setView('login'); setCurrentUser(null); }} />}
    </div>
  );
};

// --- 1. 登入介面 ---
const LoginView = ({ onAuth, onAnonymousRequest, isCommissionOpen, tos, exampleImages }) => {
  const [activeTab, setActiveTab] = useState('login'); 
  const [formData, setFormData] = useState({ name: '', password: '', code: '', contact: '', type: 'avatar', desc: '', referenceImages: [], paymentType: 'paid' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [agreeTOS, setAgreeTOS] = useState(false); 

  const handleImageChange = async (e) => { const files = Array.from(e.target.files); if (!files.length) return; if (formData.referenceImages.length + files.length > 5) { alert("參考圖最多 5 張"); return; } setIsProcessing(true); const newImages = []; for (const file of files) { try { const url = await smartUpload(file); newImages.push(url); } catch (error) { alert("圖片上傳失敗"); } } setFormData(prev => ({ ...prev, referenceImages: [...prev.referenceImages, ...newImages] })); setIsProcessing(false); e.target.value = null; };
  const removeImage = (index) => setFormData(prev => ({ ...prev, referenceImages: prev.referenceImages.filter((_, i) => i !== index) }));

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-blue-50 relative">
      {previewImage && (<div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setPreviewImage(null)}><button className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all"><X size={32} /></button><img src={previewImage} alt="Full Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-default" onClick={(e) => e.stopPropagation()} /></div>)}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[100px] animate-pulse pointer-events-none"></div><div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-sky-300/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-6 md:p-8 border border-slate-200 relative z-10">
        <div className="text-center mb-6"><div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-xl rotate-2"><Palette size={28}/></div><h1 className="text-xl md:text-2xl font-black">Commission<span className="text-blue-500">Hub</span></h1><div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isCommissionOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}><div className={`w-2 h-2 rounded-full ${isCommissionOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>{isCommissionOpen ? 'OPEN / 接單中' : 'CLOSED / 暫停接單'}</div></div>
        <div className="flex p-1 bg-slate-100 rounded-xl mb-6 overflow-x-auto no-scrollbar gap-1">{['login', 'register', 'anonymous_track', 'anonymous_req', 'forgot_password', 'artist'].map(tab => (<button key={tab} onClick={()=>{setActiveTab(tab); setFormData({name:'', password:'', code:'', contact:'', type:'avatar', desc:'', referenceImages: [], paymentType: 'paid'})}} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all whitespace-nowrap px-3 ${activeTab===tab?'bg-white text-blue-600 shadow-sm':'text-slate-400'}`}>{tab === 'login' ? '登入' : tab === 'register' ? '註冊' : tab === 'anonymous_track' ? '匿名查詢' : tab === 'anonymous_req' ? '匿名委託' : tab === 'forgot_password' ? '忘記密碼' : '繪師端'}</button>))}</div>
        {!isCommissionOpen && activeTab === 'anonymous_req' ? (<div className="text-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200"><Ban size={48} className="mx-auto text-slate-300 mb-4" /><p className="font-black text-slate-500 mb-2">目前暫停接單</p><p className="text-xs text-slate-400">繪師目前消化排單中，暫時關閉表單。<br/>請關注社群通知或稍後再來！</p></div>) : (<form onSubmit={(e)=>{ e.preventDefault(); if(activeTab === 'anonymous_req') onAnonymousRequest(formData); else onAuth(activeTab, formData); }} className="space-y-1 relative z-20"> 
            {(activeTab === 'login' || activeTab === 'register') && (<><InputBox label="會員名稱"><input required style={inputBaseStyle} placeholder="您的名稱" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} /></InputBox><InputBox label="密碼"><input required type="password" autoComplete="new-password" style={inputBaseStyle} placeholder="您的密碼" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} /></InputBox></>)}
            {activeTab === 'forgot_password' && (<div className="bg-orange-50 p-3 rounded-xl mb-3 border border-orange-100"><p className="text-xs text-orange-600 font-bold mb-3 flex items-center gap-1"><ShieldCheck size={14}/> 救援登入模式</p><InputBox label="會員名稱"><input required style={inputBaseStyle} placeholder="您的註冊名稱" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} /></InputBox><InputBox label="驗證編號"><input required style={inputBaseStyle} placeholder="輸入您名下任一委託編號" value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} /></InputBox><p className="text-[10px] text-slate-400 mt-2 font-bold">* 驗證通過後需強制重設密碼</p></div>)}
            {activeTab === 'anonymous_track' && (<><InputBox label="匿名編號"><input required style={inputBaseStyle} placeholder="您當初設定的編號" value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} /></InputBox><InputBox label="查詢密碼"><input required type="password" autoComplete="new-password" style={inputBaseStyle} placeholder="您的密碼" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} /></InputBox></>)}
            {activeTab === 'anonymous_req' && (<div className="space-y-0 overflow-y-auto max-h-[50vh] p-1 custom-scrollbar">
                <InputBox label="委託性質 (必選)"><div className="flex bg-slate-100 p-1 rounded-lg"><button type="button" onClick={()=>setFormData({...formData, paymentType: 'paid'})} className={`flex-1 py-1.5 rounded-md text-xs font-black transition-all ${formData.paymentType==='paid'?'bg-white text-emerald-600 shadow-sm':'text-slate-400'}`}>💰 付費</button><button type="button" onClick={()=>setFormData({...formData, paymentType: 'free'})} className={`flex-1 py-1.5 rounded-md text-xs font-black transition-all ${formData.paymentType==='free'?'bg-white text-pink-500 shadow-sm':'text-slate-400'}`}>🎁 無償</button></div></InputBox>
                <InputBox label="自訂查詢編號 (重要)"><input required style={inputBaseStyle} placeholder="例如：Tako001" value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} /></InputBox><InputBox label="設定查詢密碼"><input required type="password" autoComplete="new-password" style={inputBaseStyle} placeholder="日後登入查詢用" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} /></InputBox><InputBox label="您的暱稱"><input required style={inputBaseStyle} value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} /></InputBox><InputBox label="聯絡方式"><input required style={inputBaseStyle} placeholder="Discord / Email" value={formData.contact} onChange={e=>setFormData({...formData, contact: e.target.value})} /></InputBox>
                <InputBox label="委託類別">
                  <select style={inputBaseStyle} value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value})}><option value="avatar">大頭貼</option><option value="halfBody">半身插畫</option><option value="fullBody">全身立繪</option><option value="other">其他</option></select>
                  <button type="button" onClick={()=>setShowExamples(!showExamples)} className="text-[10px] text-blue-500 font-bold mt-2 flex items-center gap-1 hover:text-blue-600"><ImageIcon size={12}/> {showExamples ? '隱藏範例' : '查看範例圖'}</button>
                  {showExamples && (<div className="grid grid-cols-3 gap-2 mt-2">{exampleImages && exampleImages[formData.type] ? exampleImages[formData.type].map((src, i) => (<img key={i} src={src} className="w-full h-20 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90" onClick={()=>setPreviewImage(src)} />)) : <p className="text-xs text-slate-400">尚無範例</p>}</div>)}
                </InputBox>
                <InputBox label={`參考圖片 (選填, 最多5張) ${formData.referenceImages.length}/5`}><div className="mt-1"><label className={`flex items-center justify-center gap-2 p-3 bg-slate-100 rounded-xl cursor-pointer hover:bg-slate-200 transition-colors border-2 border-dashed border-slate-300 ${formData.referenceImages.length >= 5 || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>{isProcessing ? <Loader2 size={16} className="animate-spin text-slate-500" /> : <ImageIcon size={16} className="text-slate-500" />}<span className="text-xs font-bold text-slate-500">{isProcessing ? '處理中...' : '點擊上傳'}</span><input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} disabled={formData.referenceImages.length >= 5 || isProcessing} /></label>{formData.referenceImages.length > 0 && (<div className="grid grid-cols-4 gap-2 mt-3">{formData.referenceImages.map((img, idx) => (<div key={idx} className="relative group aspect-square"><img src={img} alt="ref" className="w-full h-full rounded-lg object-cover border border-slate-200" /><button type="button" onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-sm"><X size={10} /></button></div>))}</div>)}</div></InputBox><InputBox label="需求描述"><textarea name="desc" placeholder="請描述您的角色或需求..." style={{...inputBaseStyle, height: '60px', resize: 'none'}} value={formData.desc} onChange={e=>setFormData({...formData, desc: e.target.value})} /></InputBox>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4"><p className="text-[10px] text-slate-500 mb-2 leading-relaxed">{tos || "請遵守委託相關規定。"}</p><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="accent-blue-600" checked={agreeTOS} onChange={e=>setAgreeTOS(e.target.checked)} /><span className="text-xs font-bold text-slate-700">我已閱讀並同意服務條款</span></label></div>
            </div>)}
            {activeTab === 'artist' && (<InputBox label="繪師管理密碼"><input required type="password" style={inputBaseStyle} placeholder="管理專用" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} /></InputBox>)}
            <button type="submit" className={`w-full py-3 md:py-4 text-white font-black rounded-xl md:rounded-2xl shadow-xl transition-all active:scale-95 text-base md:text-lg mt-4 relative z-20 ${activeTab==='register'?'bg-pink-500 shadow-pink-100':activeTab==='anonymous_req'?'bg-emerald-500 shadow-emerald-100':activeTab==='forgot_password'?'bg-orange-500 shadow-orange-100':'bg-blue-600 shadow-blue-100'} ${(activeTab==='anonymous_req' && !agreeTOS) ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={isProcessing || (activeTab==='anonymous_req' && !agreeTOS)}>{activeTab === 'login' ? '登入帳號' : activeTab === 'register' ? '建立帳號' : activeTab === 'anonymous_track' ? '匿名查詢' : activeTab === 'anonymous_req' ? '送出請求' : activeTab === 'forgot_password' ? '驗證並重設' : '進入後台'}</button>
        </form>)}
      </div>
    </div>
  );
};

// --- 2. 委託人儀表板 ---
const ClientDashboard = ({ user, allCommissions, artistPaymentInfo, isCommissionOpen, tos, exampleImages, onLogout, notify }) => {
  const [viewMode, setViewMode] = useState('dashboard'); 
  const [selectedProject, setSelectedProject] = useState(null);
  const [isNewReqOpen, setNewReqOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [newRequestImgs, setNewRequestImgs] = useState([]); 
  const [previewImage, setPreviewImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [agreeTOS, setAgreeTOS] = useState(false);
  
  // 關鍵修復：補回這兩個狀態
  const [showExamples, setShowExamples] = useState(false); 
  const [reqType, setReqType] = useState('avatar'); 
  const [form, setForm] = useState({ contact: '', type: 'avatar', desc: '', paymentType: 'paid' });
  
  // 新增篩選與排序狀態
  const [statusFilter, setStatusFilter] = useState('all'); 
  const [typeFilter, setTypeFilter] = useState('all');     
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('date_desc'); 
  
  const myCommissions = user.isAnonymous 
    ? allCommissions.filter(c => c.code === user.code)
    : allCommissions.filter(c => c.userName === user.name);

  // 篩選與排序邏輯
  const filteredCommissions = useMemo(() => {
    let result = myCommissions.filter(c => {
      const searchMatch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.code.toLowerCase().includes(searchQuery.toLowerCase());
      if (!searchMatch) return false;

      let statusMatch = true;
      if (statusFilter === 'pending') statusMatch = c.status === 'pending';
      else if (statusFilter === 'ongoing') statusMatch = c.status === 'waiting' || c.status === 'working';
      else if (statusFilter === 'done') statusMatch = c.status === 'done';
      else if (statusFilter === 'declined') statusMatch = c.status === 'declined';

      let typeMatch = true;
      if (typeFilter !== 'all') typeMatch = c.type === typeFilter;
      
      return statusMatch && typeMatch;
    });

    result.sort((a, b) => {
        if (sortOrder === 'date_desc') return new Date(b.updatedAt) - new Date(a.updatedAt);
        if (sortOrder === 'date_asc') return new Date(a.updatedAt) - new Date(b.updatedAt);
        if (sortOrder === 'name_asc') return a.name.localeCompare(b.name);
        if (sortOrder === 'name_desc') return b.name.localeCompare(a.name);
        return 0;
    });

    return result;
  }, [myCommissions, statusFilter, typeFilter, searchQuery, sortOrder]);

  const handleNewRequest = async (e) => { 
      e.preventDefault(); 
      try { 
          const newItem = { 
              userName: user.name, 
              name: user.name, 
              contact: form.contact, 
              desc: form.desc, 
              type: form.type, 
              code: 'PENDING', 
              status: 'pending', 
              paymentType: form.paymentType, 
              updatedAt: new Date().toISOString(), 
              referenceImages: newRequestImgs, 
              items: { 
                  avatar: { active: form.type==='avatar', progress: 0, price: 0, payment: 'none' }, 
                  halfBody: { active: form.type==='halfBody', progress: 0, price: 0, payment: 'none' }, 
                  fullBody: { active: form.type==='fullBody', progress: 0, price: 0, payment: 'none' }, 
                  other: { active: form.type==='other', progress: 0, price: 0, payment: 'none' } 
              }, 
              timeline: [{ date: new Date().toISOString().split('T')[0], title: '申請成功', desc: '已提交新委託請求' }] 
          }; 
          await addDoc(collection(db, "commissions"), newItem); 
          notify('委託申請已送出！'); 
          setNewReqOpen(false); 
          setNewRequestImgs([]); 
      } catch(err) { 
          notify('發送失敗', 'error'); 
      } 
  };

  const handleImageChange = async (e) => { const files = Array.from(e.target.files); if (!files.length) return; setIsProcessing(true); const newImages = []; for (const file of files) { try { const url = await smartUpload(file); newImages.push(url); } catch (error) { alert("圖片上傳失敗"); } } setNewRequestImgs(prev => [...prev, ...newImages]); setIsProcessing(false); e.target.value = null; };
  const handleChangePassword = async (e) => { e.preventDefault(); const fd = new FormData(e.target); const { oldPwd, newPwd } = Object.fromEntries(fd); try { const userRef = doc(db, "users", user.name); const userSnap = await getDoc(userRef); if (userSnap.exists() && userSnap.data().password === oldPwd) { await updateDoc(userRef, { password: newPwd }); notify('密碼修改成功！'); setSettingsOpen(false); } else notify('舊密碼錯誤', 'error'); } catch(e) { notify('修改失敗', 'error'); } };
  const handleUploadPaymentProof = async (e) => { const file = e.target.files[0]; if (!file) return; try { const url = await smartUpload(file); await updateDoc(doc(db, "commissions", selectedProject.id), { paymentProof: url }); notify('匯款證明上傳成功！'); setSelectedProject(prev => ({ ...prev, paymentProof: url })); } catch (err) { notify('上傳失敗', 'error'); } };
  const toggleSort = () => { const nextSort = { 'date_desc': 'date_asc', 'date_asc': 'name_asc', 'name_asc': 'name_desc', 'name_desc': 'date_desc' }; setSortOrder(nextSort[sortOrder]); };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {previewImage && (<div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setPreviewImage(null)}><button className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all"><X size={32} /></button><img src={previewImage} alt="Full Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-default" onClick={(e) => e.stopPropagation()} /></div>)}
      <nav className="bg-white border-b p-3 md:p-4 flex justify-between items-center px-4 md:px-10 shadow-sm sticky top-0 z-40"><div className="flex items-center gap-2 md:gap-4"><div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${user.isAnonymous?'bg-emerald-500':'bg-blue-600'}`}>{user.isAnonymous?<Key size={16}/>:<User size={16}/>}</div><div className="flex gap-2 md:gap-4"><button onClick={()=>setViewMode('dashboard')} className={`font-black text-xs md:text-sm transition-colors ${viewMode==='dashboard'?'text-blue-600':'text-slate-400 hover:text-slate-600'}`}>我的委託</button><button onClick={()=>setViewMode('messenger')} className={`font-black text-xs md:text-sm transition-colors flex items-center gap-1 ${viewMode==='messenger'?'text-blue-600':'text-slate-400 hover:text-slate-600'}`}><MessageCircle size={16}/> 訊息</button></div></div><div className="flex gap-2 md:gap-3">{!user.isAnonymous && <button onClick={()=>setSettingsOpen(true)} className="text-slate-400 font-bold text-xs md:text-sm hover:text-blue-500 transition-colors flex items-center gap-1"><Settings size={14}/> 設定</button>}<button onClick={onLogout} className="text-slate-400 font-bold text-xs md:text-sm hover:text-red-500 transition-colors">登出</button></div></nav>
      <main className="max-w-5xl mx-auto p-4 md:p-8 flex-1 w-full">
        {viewMode === 'dashboard' ? (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
              <h1 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight">委託專案</h1>
              {!user.isAnonymous && (
                  <button onClick={()=>{ if(isCommissionOpen) setNewReqOpen(true); else notify('目前暫停接單中', 'error'); }} className={`w-full md:w-auto text-white px-6 py-3 rounded-xl md:rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 relative z-10 ${isCommissionOpen ? 'bg-pink-500 hover:bg-pink-600' : 'bg-slate-300 cursor-not-allowed'}`}><Plus size={18}/> 新委託</button>
              )}
            </div>

            {/* 篩選器區域 (省略以節省長度) */}
            <div className="mb-6 space-y-3"><div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-slate-400" size={16}/><input placeholder="搜尋名稱或編號..." className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs md:text-sm outline-none focus:border-blue-500 transition-all" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div><button onClick={toggleSort} className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center gap-1 text-xs font-bold">{sortOrder.includes('date') ? <Calendar size={16}/> : <Type size={16}/>}{sortOrder.includes('asc') ? <ArrowLeft className="rotate-90" size={12}/> : <ArrowLeft className="-rotate-90" size={12}/>}</button></div><div className="flex p-1 bg-white border border-slate-200 rounded-xl overflow-x-auto no-scrollbar gap-1">{['all', 'pending', 'ongoing', 'done', 'declined'].map(status => (<button key={status} onClick={() => setStatusFilter(status)} className={`flex-1 py-2 px-3 rounded-lg text-[10px] md:text-xs font-black transition-all whitespace-nowrap ${statusFilter===status ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>{status === 'all' ? '全部' : status === 'pending' ? '未確認' : status === 'ongoing' ? '進行中' : status === 'done' ? '已完成' : '已婉拒'}</button>))}</div><div className="flex gap-2 overflow-x-auto no-scrollbar">{['all', 'avatar', 'halfBody', 'fullBody', 'other'].map(type => (<button key={type} onClick={() => setTypeFilter(type)} className={`px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold border transition-all whitespace-nowrap ${typeFilter===type ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>{type === 'all' ? '所有類型' : type === 'avatar' ? '大頭' : type === 'halfBody' ? '半身' : type === 'fullBody' ? '全身' : '其他'}</button>))}</div></div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 pb-20">{filteredCommissions.map(c => (<div key={c.id} onClick={()=>setSelectedProject(c)} className={`bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border-2 ${c.status==='declined'?'border-slate-200 bg-slate-50 opacity-80':'border-slate-100'} hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer group`}><div className="flex justify-between items-start mb-4 md:mb-6"><h3 className="font-black text-lg md:text-xl capitalize">{c.type}</h3><div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${getStatusStyle(c.status)}`}>{getStatusLabel(c.status)}</div></div><div className="flex justify-between items-center"><div className="text-[10px] font-black text-slate-300 uppercase">#{c.code}</div>{c.paymentType === 'free' && <span className="bg-pink-100 text-pink-500 text-[9px] px-2 py-0.5 rounded font-black">無償</span>}</div><div className="mt-3 flex justify-between items-center text-xs font-bold text-slate-400"><span>{(c.updatedAt || '').split('T')[0]}</span><ChevronRight size={16}/></div></div>))}{filteredCommissions.length === 0 && (<div className="col-span-full text-center p-10 text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-2xl">沒有符合條件的委託</div>)}</div>
          </>
        ) : (<Messenger commissions={myCommissions} currentUser={user} />)}
      </main>
      
      {/* 委託詳情與設定彈窗 (省略) */}
      {selectedProject && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-hidden">
            <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] w-[95%] md:w-full max-w-xl p-5 md:p-10 shadow-2xl relative border border-white my-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
                <button onClick={()=>setSelectedProject(null)} className="absolute top-4 right-4 md:top-6 md:right-8 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-all"><X/></button>
                <div className="mb-6 flex items-center gap-3">
                   <h2 className="text-xl md:text-3xl font-black">委託詳情 - #{selectedProject.code}</h2>
                   {selectedProject.paymentType === 'free' && <span className="bg-pink-100 text-pink-500 px-3 py-1 rounded-lg text-xs font-black">🎁 無償</span>}
                </div>
                {/* ... (其餘詳情內容維持原樣) ... */}
                <div className="space-y-4 md:space-y-6">
                    <div className="bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200">
                        <h3 className="text-xs md:text-sm font-black text-slate-700 mb-3 flex items-center gap-2"><Banknote size={16}/> 匯款資訊</h3>
                        <div className="text-xs md:text-sm text-slate-600 whitespace-pre-line mb-3 font-bold bg-white p-3 md:p-4 rounded-xl border border-slate-100">{artistPaymentInfo || "繪師尚未設定匯款資訊，請透過聊天室詢問。"}</div>
                        <div className="flex flex-col md:flex-row items-center gap-3">
                            <label className="w-full flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"><UploadCloud size={16}/> 上傳匯款證明<input type="file" accept="image/*" className="hidden" onChange={handleUploadPaymentProof} /></label>
                            {selectedProject.paymentProof && (<button onClick={()=>setPreviewImage(selectedProject.paymentProof)} className="w-full md:w-auto flex-1 bg-emerald-50 text-emerald-600 py-2.5 rounded-xl font-bold text-xs border border-emerald-200 hover:bg-emerald-100">查看已上傳證明</button>)}
                        </div>
                    </div>
                    {(selectedProject.referenceImages?.length > 0 || selectedProject.referenceImage) && (<InputBox label="委託參考圖集"><div className="grid grid-cols-3 sm:grid-cols-4 gap-2">{(selectedProject.referenceImages || [selectedProject.referenceImage]).map((img, idx) => (<img key={idx} src={img} className="w-full aspect-square object-cover rounded-xl cursor-pointer hover:opacity-90 border border-slate-100 shadow-sm" onClick={() => setPreviewImage(img)} alt={`Ref ${idx}`} />))}</div></InputBox>)}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4"><InputBox label="目前進度"><div className="flex items-center gap-4"><div className="flex-1 h-2 md:h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{width: `${selectedProject.items[selectedProject.type]?.progress || 0}%`}}></div></div><span className="font-black text-blue-600 text-sm md:text-base">{selectedProject.items[selectedProject.type]?.progress || 0}%</span></div></InputBox><InputBox label="委託金額"><div className="font-black text-xl md:text-2xl">${selectedProject.items[selectedProject.type]?.price || 0}</div></InputBox></div>
                    {/* 若狀態為 declined，隱藏聊天室 */}
                    {selectedProject.status !== 'declined' && (
                        <InputBox label="專案討論 (Chat)"><ChatRoom commissionId={selectedProject.id} currentUser={user} status={selectedProject.status} /></InputBox>
                    )}
                </div>
            </div>
        </div>
      )}
      {/* ... (Settings modal hidden) ... */}
      {isSettingsOpen && (<div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl border border-white"><h2 className="text-xl font-black mb-6 flex items-center gap-2"><Lock size={20}/> 修改帳戶密碼</h2><form onSubmit={handleChangePassword} className="space-y-2"><InputBox label="目前舊密碼"><input name="oldPwd" type="password" required style={inputBaseStyle} /></InputBox><InputBox label="設定新密碼"><input name="newPwd" type="password" required style={inputBaseStyle} /></InputBox><div className="flex gap-3 mt-4"><button type="button" onClick={()=>setSettingsOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold">取消</button><button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg">確認修改</button></div></form></div></div>)}
      
      {/* 委託申請表單 (修復：使用正確的狀態 paymentType) */}
      {isNewReqOpen && (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto"><div className="bg-white rounded-[1.5rem] w-[95%] md:w-full max-w-md p-6 md:p-8 shadow-2xl border border-white my-4"><div className="flex justify-between items-center mb-6 md:mb-10"><h2 className="text-xl md:text-2xl font-black flex items-center gap-3"><Mail className="text-pink-500"/> 發起新委託</h2><button onClick={()=>setNewReqOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-all"><X size={20}/></button></div><form onSubmit={handleNewRequest} className="space-y-2"><InputBox label="聯絡方式"><input name="contact" required style={inputBaseStyle} placeholder="Discord ID / Email" value={form.contact} onChange={e=>setForm({...form, contact: e.target.value})} /></InputBox><InputBox label="委託類別"><select name="type" style={inputBaseStyle} className="cursor-pointer" value={form.type} onChange={(e)=>{ setForm({...form, type: e.target.value}); setReqType(e.target.value); setNewRequestImgs([]); }}><option value="avatar">大頭貼</option><option value="halfBody">半身插畫</option><option value="fullBody">全身立繪</option><option value="other">其他</option></select><button type="button" onClick={()=>setShowExamples(!showExamples)} className="text-[10px] text-blue-500 font-bold mt-2 flex items-center gap-1 hover:text-blue-600"><ImageIcon size={12}/> {showExamples ? '隱藏範例' : '查看範例圖'}</button>{showExamples && (<div className="grid grid-cols-3 gap-2 mt-2">{exampleImages && exampleImages[reqType] ? exampleImages[reqType].map((src, i) => (<img key={i} src={src} className="w-full h-20 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90" onClick={()=>setPreviewImage(src)} />)) : <p className="text-xs text-slate-400">尚無範例</p>}</div>)}</InputBox><InputBox label="委託性質 (必選)"><div className="flex bg-slate-100 p-1 rounded-lg"><button type="button" onClick={()=>setForm({...form, paymentType: 'paid'})} className={`flex-1 py-1.5 rounded-md text-xs font-black transition-all ${form.paymentType==='paid'?'bg-white text-emerald-600 shadow-sm':'text-slate-400'}`}>💰 付費</button><button type="button" onClick={()=>setForm({...form, paymentType: 'free'})} className={`flex-1 py-1.5 rounded-md text-xs font-black transition-all ${form.paymentType==='free'?'bg-white text-pink-500 shadow-sm':'text-slate-400'}`}>無償 (需選擇)</button></div><div className="flex gap-2 mt-1"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="paymentType" value="paid" checked={form.paymentType==='paid'} onChange={()=>setForm({...form, paymentType: 'paid'})} className="accent-blue-600"/> <span className="text-xs font-bold text-slate-600">付費委託</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="paymentType" value="free" checked={form.paymentType==='free'} onChange={()=>setForm({...form, paymentType: 'free'})} className="accent-pink-500"/> <span className="text-xs font-bold text-slate-600">無償/贈圖</span></label></div></InputBox><InputBox label={`參考圖片 (選填, 最多5張) ${newRequestImgs.length}/5`}><div className="mt-1"><label className={`flex items-center justify-center gap-2 p-3 bg-slate-100 rounded-xl cursor-pointer hover:bg-slate-200 transition-colors border-2 border-dashed border-slate-300 ${newRequestImgs.length >= 5 || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>{isProcessing ? <Loader2 size={16} className="animate-spin text-slate-500" /> : <ImageIcon size={16} className="text-slate-500" />}<span className="text-xs font-bold text-slate-500">{isProcessing ? '處理中...' : '點擊上傳'}</span><input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} disabled={newRequestImgs.length >= 5 || isProcessing} /></label>{newRequestImgs.length > 0 && (<div className="grid grid-cols-4 gap-2 mt-3">{newRequestImgs.map((img, idx) => (<div key={idx} className="relative group aspect-square"><img src={img} alt="ref" className="w-full h-full rounded-lg object-cover border border-slate-200" /><button type="button" onClick={() => setNewRequestImgs(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-sm"><X size={10} /></button></div>))}</div>)}</div></InputBox><InputBox label="需求描述"><textarea name="desc" placeholder="請描述您的角色或需求..." style={{...inputBaseStyle, height: '80px', resize: 'none'}} value={form.desc} onChange={e=>setForm({...form, desc: e.target.value})} /></InputBox>
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4"><p className="text-[10px] text-slate-500 mb-2 leading-relaxed">{tos || "請遵守委託相關規定。"}</p><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="accent-blue-600" checked={agreeTOS} onChange={e=>setAgreeTOS(e.target.checked)} /><span className="text-xs font-bold text-slate-700">我已閱讀並同意服務條款</span></label></div><button type="submit" className={`w-full py-4 bg-pink-500 text-white font-black rounded-xl shadow-xl hover:bg-pink-600 mt-4 ${!agreeTOS && 'opacity-50 cursor-not-allowed'}`} disabled={isProcessing || !agreeTOS}>送出請求</button></form></div></div>)}
    </div>
  );
};

// --- 3. 繪師後台 (新增匯款資訊設定 & 查看證明 & 管理範例圖) ---
const ArtistDashboard = ({ commissions, registeredUsers, artistSettings, notify, onLogout }) => {
  // ... (State logic same as before) ...
  const [activeMainTab, setActiveMainTab] = useState('commissions'); const [subTab, setSubTab] = useState('all'); const [searchQuery, setSearchQuery] = useState(''); const [editItem, setEditItem] = useState(null); const [selectedUserDetail, setSelectedUserDetail] = useState(null); const [isSettingsOpen, setSettingsOpen] = useState(false); const [previewImage, setPreviewImage] = useState(null);
  
  // 新增：範例圖編輯狀態
  const [editExampleType, setEditExampleType] = useState('avatar');
  // const [editExampleLinks, setEditExampleLinks] = useState('');
  
  // 圖片上傳狀態
  const [isUploadingExample, setIsUploadingExample] = useState(false);
  const [editExampleImages, setEditExampleImages] = useState([]);

  // 初始化編輯範例圖
  useEffect(() => {
      if (artistSettings.exampleImages) {
          setEditExampleImages(artistSettings.exampleImages[editExampleType] || []);
      } else {
          setEditExampleImages([]);
      }
  }, [editExampleType, artistSettings]);

  const filteredAll = useMemo(() => { return commissions.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.code.toLowerCase().includes(searchQuery.toLowerCase()) || (c.userName && c.userName.toLowerCase().includes(searchQuery.toLowerCase()))); }, [commissions, searchQuery]);
  const requestsList = filteredAll.filter(c => c.status === 'pending'); const ongoingList = filteredAll.filter(c => c.status !== 'pending' && c.status !== 'done'); const getSubFiltered = (list) => subTab === 'all' ? list : list.filter(c => c.type === subTab);
  const handleUpdateSettings = async (e) => { e.preventDefault(); const fd = new FormData(e.target); const { oldPwd, newPwd, paymentInfo, tos, isOpen } = Object.fromEntries(fd); if (oldPwd && oldPwd !== artistSettings.password) { notify('舊密碼錯誤', 'error'); return; } const updateData = { paymentInfo, tos, isOpen: isOpen === 'on' }; if(newPwd) updateData.password = newPwd; try { await updateDoc(doc(db, "settings", "admin_config"), updateData); notify('設定更新成功！'); setSettingsOpen(false); } catch(e) { notify('更新失敗', 'error'); } };
  
  // 新增：範例圖上傳
  const handleExampleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setIsUploadingExample(true);
    const newImages = [];
    for (const file of files) {
        try { 
            const result = await smartUpload(file);
            newImages.push(result); 
        } catch (error) { alert("圖片上傳失敗"); }
    }
    setEditExampleImages(prev => [...prev, ...newImages]);
    setIsUploadingExample(false);
    e.target.value = null; 
  };

  const removeExampleImage = (index) => {
      setEditExampleImages(prev => prev.filter((_, i) => i !== index));
  };

  // 新增：儲存範例圖
  const handleSaveExamples = async () => {
      // 確保 exampleImages 是一個物件，避免 undefined
      const currentExamples = artistSettings.exampleImages || {};
      const newExamples = { ...currentExamples, [editExampleType]: editExampleImages };
      try {
          await updateDoc(doc(db, "settings", "admin_config"), { exampleImages: newExamples });
          notify('範例圖更新成功！');
      } catch (e) { notify('更新失敗', 'error'); }
  };

  // 匯出 CSV 功能
  const handleExportCSV = () => {
      const headers = ["委託人", "編號", "類型", "狀態", "金額", "時間"];
      const rows = commissions.map(c => [c.name, c.code, c.type, c.status, c.items[c.type]?.price, c.updatedAt.split('T')[0]]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `commissions_backup_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {previewImage && (<div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setPreviewImage(null)}><button className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all"><X size={32} /></button><img src={previewImage} alt="Full Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-default" onClick={(e) => e.stopPropagation()} /></div>)}
      <nav className="bg-slate-900 text-white p-4 md:p-5 flex justify-between items-center px-4 md:px-10 shadow-xl sticky top-0 z-50"><div className="flex items-center gap-3"><div className="bg-blue-500 p-2 rounded-xl shadow-lg"><Palette size={20}/></div><span className="font-black tracking-tight text-lg lg:text-xl">Artist Center</span></div><div className="flex items-center gap-2 md:gap-4"><div className="relative hidden md:block"><Search className="absolute left-3 top-2.5 text-slate-500" size={16}/><input placeholder="搜尋名稱、編號..." className="bg-white/10 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:bg-white/20 transition-all w-64 text-white" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} /></div><button onClick={()=>setSettingsOpen(true)} className="text-slate-400 font-bold text-xs hover:text-white px-3 py-2 bg-white/5 rounded-lg flex items-center gap-1"><Settings size={14}/></button><button onClick={onLogout} className="text-slate-400 font-bold text-xs hover:text-white px-3 py-2 bg-white/5 rounded-lg">登出</button></div></nav>
      <div className="md:hidden p-3 bg-slate-900 border-t border-slate-800"><input placeholder="搜尋..." className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none text-white" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} /></div>
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        <aside className="w-64 bg-white border-r p-6 space-y-2 hidden lg:flex flex-col shrink-0"><NavButtons activeMainTab={activeMainTab} setActiveMainTab={setActiveMainTab} requestsCount={requestsList.length} /></aside>
        <main className="flex-1 p-3 lg:p-8 overflow-y-auto custom-scrollbar">
            <div className="lg:hidden mb-4 overflow-x-auto pb-2 no-scrollbar"><div className="flex gap-2 min-w-max"><NavButtons activeMainTab={activeMainTab} setActiveMainTab={setActiveMainTab} requestsCount={requestsList.length} mobile /></div></div>
            {activeMainTab === 'messages' ? (<Messenger commissions={commissions} currentUser={{ name: '繪師', role: 'artist' }} />) : (<>
                {activeMainTab !== 'accounts' && (
                    <div className="space-y-4 mb-8">
                         {/* 排序按鈕 */}
                         <div className="flex justify-end">
                            <button onClick={toggleSort} className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center gap-1 text-xs font-bold">
                                {sortOrder.includes('date') ? <Calendar size={14}/> : <Type size={14}/>}
                                {sortOrder.includes('asc') ? '升冪' : '降冪'}
                            </button>
                         </div>

                         {/* 狀態過濾 (僅委託類) */}
                         {activeMainTab === 'commissions' && (
                            <div className="flex p-1 bg-white border border-slate-200 rounded-xl overflow-x-auto no-scrollbar gap-1 w-fit">
                                {['all', 'ongoing', 'done', 'declined'].map(status => (
                                    <button key={status} onClick={() => setStatusFilter(status)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter===status ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
                                        {status === 'all' ? '全部狀態' : status === 'ongoing' ? '進行中' : status === 'done' ? '已完成' : '已婉拒'}
                                    </button>
                                ))}
                            </div>
                         )}
                         
                         {/* 類型過濾 */}
                         <div className="flex gap-2 bg-white p-1.5 rounded-xl border w-fit shadow-sm overflow-x-auto max-w-full">
                            {['all', 'avatar', 'halfBody', 'fullBody', 'other'].map(t => (
                                <button key={t} onClick={()=>setSubTab(t)} className={`px-4 lg:px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${subTab===t?'bg-slate-900 text-white':'text-slate-400 hover:text-slate-600'}`}>{t === 'all' ? '所有類型' : t}</button>
                            ))}
                        </div>
                    </div>
                )}
                
                {activeMainTab === 'accounts' && (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">{registeredUsers.map(u => (<div key={u.id} onClick={()=>setSelectedUserDetail(u)} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group flex items-center gap-4"><div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors"><User size={20}/></div><div><h3 className="font-black text-base">{u.name}</h3><span className="text-[10px] font-bold text-slate-300">會員帳號</span></div><ChevronRight className="ml-auto text-slate-200" size={18}/></div>))}</div>)}
                
                {(activeMainTab === 'commissions' || activeMainTab === 'requests') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                        {getDisplayList().map(c => (
                            <div key={c.id} className={`bg-white p-6 rounded-[2rem] border ${c.status==='declined'?'border-slate-200 opacity-60 bg-slate-50':'border-slate-100'} shadow-sm hover:shadow-2xl transition-all relative`}>
                                <div className="flex justify-between items-start mb-4"><div><h3 className="font-black text-lg">{c.name}</h3><span className="text-[10px] font-black text-slate-300">#{c.code}</span></div><div className="flex flex-col items-end gap-1"><div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${getStatusStyle(c.status)}`}>{getStatusLabel(c.status)}</div>{c.paymentType === 'free' && <span className="text-[9px] font-black text-pink-400 bg-pink-50 px-2 py-0.5 rounded">無償</span>}</div></div><div className="text-[10px] font-black text-slate-400 uppercase mb-4 bg-slate-50 p-2 rounded-xl border">類別: <span className="text-slate-800">{c.type}</span></div><button onClick={()=>setEditItem(c)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-blue-600 transition-all">管理詳情</button>
                            </div>
                        ))}
                        {getDisplayList().length === 0 && (
                            <div className="col-span-full text-center p-10 text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-2xl">沒有符合條件的資料</div>
                        )}
                    </div>
                )}
            </>)}
        </main>
      </div>
      {/* 繪師設定彈窗 (含範例圖管理) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl border border-white max-h-[90vh] overflow-y-auto custom-scrollbar">
                <h2 className="text-xl font-black mb-6 flex items-center gap-2"><Settings size={20}/> 系統與匯款設定</h2>
                <form onSubmit={handleUpdateSettings} className="space-y-4">
                    {/* 接單開關 */}
                    <div className="bg-slate-50 p-4 rounded-xl flex items-center justify-between border border-slate-200">
                        <span className="font-bold text-sm text-slate-700">開放接單狀態</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" name="isOpen" className="sr-only peer" defaultChecked={artistSettings.isOpen} />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                    
                    {/* 範例圖管理區塊 */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <span className="font-bold text-sm text-slate-700 block mb-2">作品範例圖管理</span>
                        <select className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold mb-4" value={editExampleType} onChange={e=>setEditExampleType(e.target.value)}>
                            <option value="avatar">大頭貼</option>
                            <option value="halfBody">半身插畫</option>
                            <option value="fullBody">全身立繪</option>
                            <option value="other">其他</option>
                        </select>
                        
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            {editExampleImages.map((src, idx) => (
                                <div key={idx} className="relative group aspect-square">
                                    <img src={src} alt="example" className="w-full h-full object-cover rounded-lg border border-slate-200" />
                                    <button type="button" onClick={() => removeExampleImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"><X size={12}/></button>
                                </div>
                            ))}
                            <label className={`flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors aspect-square ${isUploadingExample ? 'opacity-50' : ''}`}>
                                {isUploadingExample ? <Loader2 size={20} className="animate-spin text-slate-400"/> : <Plus size={24} className="text-slate-400"/>}
                                <span className="text-[10px] text-slate-400 font-bold mt-1">新增</span>
                                <input type="file" accept="image/*" multiple className="hidden" onChange={handleExampleImageUpload} disabled={isUploadingExample}/>
                            </label>
                        </div>
                        
                        <button type="button" onClick={handleSaveExamples} className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">儲存此分類範例</button>
                    </div>

                    <InputBox label="服務條款 (TOS)"><textarea name="tos" style={{...inputBaseStyle, height:'80px', resize:'none'}} defaultValue={artistSettings.tos} placeholder="請輸入委託須知..."/></InputBox>
                    <InputBox label="匯款資訊"><textarea name="paymentInfo" style={{...inputBaseStyle, height:'60px', resize:'none'}} defaultValue={artistSettings.paymentInfo} placeholder="銀行帳號..."/></InputBox>
                    
                    <div className="border-t pt-4 mt-4 mb-2"><p className="text-xs font-bold text-slate-400 mb-2">修改密碼 (若不改請留空)</p></div>
                    <InputBox label="舊密碼"><input name="oldPwd" type="password" autoComplete="new-password" style={inputBaseStyle} /></InputBox>
                    <InputBox label="新密碼"><input name="newPwd" type="password" autoComplete="new-password" style={inputBaseStyle} /></InputBox>
                    
                    <div className="flex gap-3 mt-4">
                        <button type="button" onClick={handleExportCSV} className="flex-1 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold flex items-center justify-center gap-1"><Download size={16}/> 匯出備份</button>
                        <button type="submit" className="flex-1 py-3 bg-slate-900 text-white font-black rounded-xl shadow-lg">儲存設定</button>
                    </div>
                    <button type="button" onClick={()=>setSettingsOpen(false)} className="w-full py-3 bg-slate-100 rounded-xl font-bold text-slate-500">關閉</button>
                </form>
            </div>
        </div>
      )}
      {/* 編輯委託彈窗 (手機版優化 + 婉拒按鈕) */}
      {editItem && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-[2rem] w-[95%] md:w-full max-w-xl p-5 md:p-10 shadow-2xl relative border border-white my-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
                <button onClick={()=>setEditItem(null)} className="absolute top-4 right-4 md:top-8 md:right-8 p-3 bg-slate-100 rounded-full hover:bg-slate-200 transition-all"><X size={24}/></button>
                <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-xl md:text-2xl font-black text-slate-800">編輯：#{editItem.code}</h2>
                    {editItem.paymentType === 'free' ? <span className="bg-pink-100 text-pink-500 px-3 py-1 rounded-lg text-xs font-black">🎁 無償</span> : <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-lg text-xs font-black">💰 付費</span>}
                </div>
                <div className="mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
                    <div className="text-xs font-bold text-slate-600">匯款證明</div>
                    {editItem.paymentProof ? (<button onClick={()=>setPreviewImage(editItem.paymentProof)} className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg font-bold text-[10px] shadow-md hover:bg-emerald-600">查看圖片</button>) : (<span className="text-[10px] font-bold text-slate-400">無</span>)}
                </div>
                {(editItem.referenceImages?.length > 0 || editItem.referenceImage) && (<InputBox label="參考圖集"><div className="grid grid-cols-3 sm:grid-cols-4 gap-2">{(editItem.referenceImages || [editItem.referenceImage]).map((img, idx) => (<img key={idx} src={img} className="w-full aspect-square object-cover rounded-lg border border-slate-100 shadow-sm" onClick={() => setPreviewImage(img)} alt={`Ref ${idx}`} />))}</div></InputBox>)}
                <form onSubmit={async (e)=>{ e.preventDefault(); await updateDoc(doc(db, "commissions", editItem.id), { ...editItem, updatedAt: new Date().toISOString() }); notify('雲端同步成功'); setEditItem(null); }} className="space-y-1">
                    <div className="grid grid-cols-2 gap-3"><InputBox label="編號"><input style={inputBaseStyle} value={editItem.code} onChange={e=>setEditItem({...editItem, code: e.target.value})} /></InputBox><InputBox label="狀態"><select style={inputBaseStyle} value={editItem.status} onChange={e=>setEditItem({...editItem, status: e.target.value})}><option value="pending">待核准</option><option value="waiting">排單中</option><option value="working">進行中</option><option value="done">已完成</option><option value="declined">已婉拒</option></select></InputBox></div>
                    <div className="grid grid-cols-2 gap-3"><InputBox label="進度 %"><input type="number" style={inputBaseStyle} value={editItem.items[editItem.type]?.progress || 0} onChange={e=>{ const items = {...editItem.items}; if(!items[editItem.type]) items[editItem.type] = {active: true, progress: 0, price: 0}; items[editItem.type].progress = parseInt(e.target.value); setEditItem({...editItem, items}); }} /></InputBox><InputBox label="金額 $"><input type="number" style={inputBaseStyle} value={editItem.items[editItem.type]?.price || 0} onChange={e=>{ const items = {...editItem.items}; if(!items[editItem.type]) items[editItem.type] = {active: true, progress: 0, price: 0}; items[editItem.type].price = parseInt(e.target.value); setEditItem({...editItem, items}); }} /></InputBox></div>
                    <InputBox label="備註"><textarea style={{...inputBaseStyle, height:'80px', resize:'none'}} value={editItem.note} onChange={e=>setEditItem({...editItem, note: e.target.value})} /></InputBox>
                    {/* 若狀態為 declined，隱藏聊天室 */}
                    {editItem.status !== 'declined' && (
                        <InputBox label="討論"><ChatRoom commissionId={editItem.id} currentUser={{ name: '繪師', role: 'artist' }} heightClass="h-48" status={editItem.status} /></InputBox>
                    )}
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={async ()=>{ 
                            if(confirm('確定要婉拒此委託嗎？(委託人將會看到婉拒狀態)')){ 
                                await updateDoc(doc(db, "commissions", editItem.id), { status: 'declined', updatedAt: new Date().toISOString() }); 
                                notify('已婉拒委託'); 
                                setEditItem(null); 
                            } 
                        }} className="px-4 py-3 bg-slate-200 text-slate-500 font-bold rounded-xl text-xs hover:bg-slate-300 transition-all">婉拒</button>
                        <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl text-sm">儲存同步</button>
                    </div>
                </form>
            </div>
        </div>
      )}
      {selectedUserDetail && (<div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto"><div className="bg-white rounded-[2rem] w-[95%] md:w-full max-w-4xl p-5 md:p-10 shadow-2xl relative my-4 border border-white max-h-[85vh] overflow-y-auto custom-scrollbar"><button onClick={()=>setSelectedUserDetail(null)} className="absolute top-4 right-4 md:top-8 md:right-8 p-2 bg-slate-100 rounded-full"><X/></button><div className="mb-6 flex items-center gap-3"><div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500"><Users size={24}/></div><h2 className="text-2xl font-black">{selectedUserDetail.name}</h2></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{commissions.filter(c => c.userName === selectedUserDetail.name).map(c => (<div key={c.id} className={`p-4 bg-slate-50 rounded-[1.5rem] border ${c.status==='declined'?'border-slate-300 opacity-60':'border-slate-200'} flex justify-between items-center`}><div><h4 className="font-black text-slate-800 text-sm">{c.type}</h4><span className="text-[10px] font-bold text-slate-400 uppercase">#{c.code} | {getStatusLabel(c.status)}</span></div><button onClick={()=>{setEditItem(c); setSelectedUserDetail(null);}} className="p-2 bg-white rounded-xl shadow-sm text-blue-500"><Edit3 size={16}/></button></div>))}</div></div></div>)}
    </div>
  );
};

// 抽離的導航按鈕組件 (字體縮小)
const NavButtons = ({ activeMainTab, setActiveMainTab, requestsCount, mobile }) => (
    <>
        <button onClick={()=>setActiveMainTab('accounts')} className={`${mobile ? 'px-4 py-2 rounded-xl text-[10px] whitespace-nowrap' : 'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm'} font-black transition-all ${activeMainTab==='accounts'?'bg-blue-600 text-white shadow-lg':'text-slate-400 hover:bg-slate-50'}`}>
            {!mobile && <Users size={18}/>} 帳號類
        </button>
        <button onClick={()=>setActiveMainTab('commissions')} className={`${mobile ? 'px-4 py-2 rounded-xl text-[10px] whitespace-nowrap' : 'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm'} font-black transition-all ${activeMainTab==='commissions'?'bg-blue-600 text-white shadow-lg':'text-slate-400 hover:bg-slate-50'}`}>
            {!mobile && <Activity size={18}/>} 委託類
        </button>
        <button onClick={()=>setActiveMainTab('requests')} className={`${mobile ? 'px-4 py-2 rounded-xl text-[10px] whitespace-nowrap' : 'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm'} font-black transition-all ${activeMainTab==='requests'?'bg-blue-600 text-white shadow-lg':'text-slate-400 hover:bg-slate-50'}`}>
            {!mobile && <Inbox size={18}/>} 委託請求
            {requestsCount > 0 && <span className={`ml-auto bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full ${mobile && 'ml-1'}`}>{requestsCount}</span>}
        </button>
        <button onClick={()=>setActiveMainTab('messages')} className={`${mobile ? 'px-4 py-2 rounded-xl text-[10px] whitespace-nowrap' : 'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm'} font-black transition-all ${activeMainTab==='messages'?'bg-blue-600 text-white shadow-lg':'text-slate-400 hover:bg-slate-50'}`}>
            {!mobile && <MessageCircle size={18}/>} 訊息中心
        </button>
    </>
);

const styles = `
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
`;

export default App;