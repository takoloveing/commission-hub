import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Palette, User, Lock, CheckCircle2, AlertCircle, Clock, Sparkles, LogOut, Plus, 
  Edit3, Trash2, MessageCircle, ChevronRight, X, Activity, Image as ImageIcon, 
  DollarSign, ShieldCheck, FileText, Download, Cloud, Mail, Send, Key, Settings, 
  Search, Users, Inbox, Ban, BarChart3, UploadCloud, Banknote, Gift, Filter, 
  ArrowDownUp, Calendar, Type, Power, Loader2
} from 'lucide-react';

// --- Firebase 標準模組引入 ---
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, 
  doc, onSnapshot, query, orderBy, setDoc, getDoc, where 
} from 'firebase/firestore';
import { 
  getStorage, ref, uploadBytes, getDownloadURL 
} from 'firebase/storage';

// ⚠️ Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyCeHj5Kc6E_ltyXboL7cWSpFClq4FrCrvU",
  authDomain: "commission-hub-cc739.firebaseapp.com",
  projectId: "commission-hub-cc739",
  storageBucket: "commission-hub-cc739.firebasestorage.app",
  messagingSenderId: "1022991297741",
  appId: "1:1022991297741:web:df716fcd268c0d9d2c8d84"
};

// 初始化 Firebase (含錯誤處理)
let app, db, storage;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (e) {
  console.error("Firebase Init Error:", e);
}

// --- 全域常數 ---
const DEFAULT_EXAMPLES = {
  avatar: ["https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400"],
  halfBody: ["https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400"],
  fullBody: ["https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400"],
  other: ["https://images.unsplash.com/photo-1620641788427-b11a684e925c?w=500"]
};

// --- 工具函數：圖片壓縮 ---
const compressImage = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                let w = img.width, h = img.height, max = 1000;
                if (w > h && w > max) { h *= max/w; w = max; }
                else if (h > max) { w *= max/h; h = max; }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
};

// --- 工具函數：智慧上傳 (Storage 優先 -> Base64 備援) ---
const smartUpload = async (file) => {
    if (!file) return null;
    if (typeof file === 'string') return file; // 已經是網址
    
    try {
        if (!storage) throw new Error("Storage unavailable");
        const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    } catch (e) {
        console.warn("Storage upload failed, fallback to Base64:", e);
        const base64 = await compressImage(file);
        if (base64.length > 950000) throw new Error("圖片過大且雲端儲存失敗");
        return base64;
    }
};

// --- UI 組件 ---
const UI = {
    // 基礎容器
    Card: ({ children, className = "" }) => (
        <div className={`bg-white rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-100 p-4 md:p-6 ${className}`}>
            {children}
        </div>
    ),
    // 輸入框
    Input: ({ label, children }) => (
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-3 mb-3 relative z-10 shadow-sm focus-within:border-blue-400 transition-colors">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{label}</label>
            {children}
        </div>
    ),
    Field: (props) => <input {...props} className="w-full bg-transparent border-none outline-none font-bold text-sm text-slate-700 placeholder:text-slate-300" />,
    TextArea: (props) => <textarea {...props} className="w-full bg-transparent border-none outline-none font-bold text-sm text-slate-700 placeholder:text-slate-300 resize-none h-20" />,
    // 按鈕
    Button: ({ onClick, children, disabled, variant='primary', className="" }) => {
        const base = "w-full py-3.5 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
        const variants = {
            primary: "bg-slate-900 text-white shadow-lg shadow-slate-200",
            danger: "bg-red-500 text-white shadow-lg shadow-red-200",
            ghost: "bg-slate-100 text-slate-500 hover:bg-slate-200"
        };
        return <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>{children}</button>;
    },
    // 狀態標籤
    StatusBadge: ({ status }) => {
        const styles = {
            pending: 'bg-pink-500 text-white animate-pulse',
            waiting: 'bg-blue-50 text-blue-500 border border-blue-100',
            working: 'bg-indigo-500 text-white',
            done: 'bg-emerald-500 text-white',
            declined: 'bg-slate-300 text-slate-500'
        };
        const labels = { pending: '待核准', waiting: '排單中', working: '進行中', done: '已完成', declined: '已婉拒' };
        return <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${styles[status] || styles.waiting}`}>{labels[status] || status}</span>;
    },
    // 圖片燈箱
    Lightbox: ({ src, onClose }) => src ? (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4 cursor-zoom-out" onClick={onClose}>
            <img src={src} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
            <button className="absolute top-6 right-6 text-white p-2 bg-white/10 rounded-full"><X size={24}/></button>
        </div>
    ) : null,
    // 彈出視窗
    Modal: ({ title, onClose, children }) => (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar relative animate-in zoom-in-95 duration-200 border border-white/20">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-slate-800">{title}</h3>
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={20}/></button>
                </div>
                {children}
            </div>
        </div>
    )
};

// --- 功能模組：聊天室 ---
const ChatRoom = ({ commissionId, currentUser, status }) => {
    const [msgs, setMsgs] = useState([]);
    const [txt, setTxt] = useState('');
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const bottomRef = useRef(null);

    useEffect(() => {
        if (!commissionId || !db) return;
        const q = query(collection(db, "messages"), where("commissionId", "==", commissionId), orderBy("createdAt"));
        return onSnapshot(q, (snap) => {
            setMsgs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });
    }, [commissionId]);

    const send = async (type, content) => {
        if (!content) return;
        setLoading(true);
        try {
            let finalContent = content;
            if (type === 'image') finalContent = await smartUpload(content);
            await addDoc(collection(db, "messages"), {
                commissionId, type, [type==='text'?'text':'image']: finalContent,
                sender: currentUser.name, role: currentUser.role, createdAt: new Date().toISOString()
            });
            if (type === 'text') setTxt('');
        } catch(e) { alert("發送失敗"); }
        setLoading(false);
    };

    if (status === 'declined') return <div className="h-32 flex items-center justify-center bg-slate-100 rounded-xl text-slate-400 font-bold text-xs"><Ban size={16} className="mr-2"/> 此委託已婉拒，討論關閉</div>;

    return (
        <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl h-80 flex flex-col overflow-hidden relative">
            <UI.Lightbox src={preview} onClose={()=>setPreview(null)}/>
            {loading && <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {msgs.length === 0 && <div className="text-center text-slate-300 text-xs font-black mt-10">尚無訊息</div>}
                {msgs.map(m => {
                    const isMe = m.role === currentUser.role;
                    return (
                        <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {m.type === 'text' ? 
                                <div className={`px-4 py-2 rounded-2xl text-xs font-bold max-w-[85%] ${isMe ? 'bg-slate-800 text-white rounded-br-none' : 'bg-white border text-slate-700 rounded-bl-none'}`}>{m.text}</div> :
                                <img src={m.image} className="w-24 h-24 object-cover rounded-xl border bg-white cursor-pointer" onClick={()=>setPreview(m.image)}/>
                            }
                            <span className="text-[9px] text-slate-400 mt-1 font-bold px-1">{m.sender}</span>
                        </div>
                    )
                })}
                <div ref={bottomRef}/>
            </div>
            <div className="p-2 bg-white border-t flex gap-2">
                <label className="p-3 bg-slate-100 rounded-xl cursor-pointer hover:bg-slate-200"><ImageIcon size={18}/><input type="file" hidden onChange={e=>send('image', e.target.files[0])}/></label>
                <input className="flex-1 bg-slate-100 rounded-xl px-4 text-xs font-bold outline-none" value={txt} onChange={e=>setTxt(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send('text',txt)} placeholder="輸入訊息..." />
                <button onClick={()=>send('text',txt)} className="p-3 bg-blue-600 text-white rounded-xl"><Send size={18}/></button>
            </div>
        </div>
    );
};

// --- 畫面 1: 登入/註冊/匿名 ---
const LoginView = ({ onAuth, settings, onAnonymousRequest }) => {
    const [tab, setTab] = useState('login');
    const [form, setForm] = useState({ name: '', password: '', code: '', contact: '', type: 'avatar', desc: '', paymentType: 'paid', referenceImages: [] });
    const [loading, setLoading] = useState(false);
    const [agreeTOS, setAgreeTOS] = useState(false);
    const [showExamples, setShowExamples] = useState(false);
    const [preview, setPreview] = useState(null);

    const handleImg = async (e) => {
        if (!e.target.files.length) return;
        setLoading(true);
        const urls = [];
        for (const f of e.target.files) {
            try { urls.push(await smartUpload(f)); } catch {}
        }
        setForm(p => ({ ...p, referenceImages: [...p.referenceImages, ...urls] }));
        setLoading(false);
    };

    const handleSubmit = () => {
        if (tab === 'anonymous_req') {
            if (!settings.isOpen) return alert("目前暫停接單");
            if (!agreeTOS) return alert("請先同意服務條款");
            onAnonymousRequest(form);
        } else {
            onAuth(tab, form);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-blue-50">
            <UI.Lightbox src={preview} onClose={()=>setPreview(null)}/>
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 relative overflow-hidden">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-slate-800">Commission<span className="text-blue-600">Hub</span></h1>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase mt-2 ${settings.isOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${settings.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                        {settings.isOpen ? '接單中' : '暫停接單'}
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 overflow-x-auto no-scrollbar">
                    {['login', 'register', 'anonymous_track', 'anonymous_req', 'artist'].map(t => (
                        <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold whitespace-nowrap px-3 transition-all ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
                            {t === 'login' ? '登入' : t === 'register' ? '註冊' : t === 'anonymous_track' ? '查進度' : t === 'anonymous_req' ? '匿名委託' : '繪師後台'}
                        </button>
                    ))}
                </div>

                {tab === 'anonymous_req' && !settings.isOpen ? (
                    <div className="text-center p-10 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                        <Ban size={40} className="mx-auto mb-3 opacity-50"/>
                        <p className="font-bold">目前暫停接單</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {/* 根據 Tab 顯示不同欄位 */}
                        {(tab === 'login' || tab === 'register') && (
                            <>
                                <UI.Input label="帳號"><UI.Field value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></UI.Input>
                                <UI.Input label="密碼"><UI.Field type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></UI.Input>
                            </>
                        )}
                        {tab === 'anonymous_track' && (
                            <>
                                <UI.Input label="查詢編號"><UI.Field placeholder="例如 Tako001" value={form.code} onChange={e => setForm({...form, code: e.target.value})} /></UI.Input>
                                <UI.Input label="查詢密碼"><UI.Field type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></UI.Input>
                            </>
                        )}
                        {tab === 'artist' && (
                            <UI.Input label="管理員密碼"><UI.Field type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></UI.Input>
                        )}
                        {tab === 'anonymous_req' && (
                            <div className="max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                                <div className="flex gap-2 mb-3">
                                    <button onClick={()=>setForm({...form, paymentType: 'paid'})} className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 ${form.paymentType==='paid'?'border-emerald-200 bg-emerald-50 text-emerald-600':'border-slate-100 text-slate-400'}`}>💰 付費</button>
                                    <button onClick={()=>setForm({...form, paymentType: 'free'})} className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 ${form.paymentType==='free'?'border-pink-200 bg-pink-50 text-pink-500':'border-slate-100 text-slate-400'}`}>🎁 無償</button>
                                </div>
                                <UI.Input label="自訂編號"><UI.Field placeholder="例如 Tako001" value={form.code} onChange={e => setForm({...form, code: e.target.value})} /></UI.Input>
                                <UI.Input label="查詢密碼"><UI.Field type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></UI.Input>
                                <UI.Input label="您的暱稱"><UI.Field value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></UI.Input>
                                <UI.Input label="聯絡方式"><UI.Field placeholder="Discord / Email" value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} /></UI.Input>
                                <UI.Input label="類別">
                                    <select className="w-full bg-transparent font-bold text-sm outline-none" value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option value="avatar">大頭貼</option><option value="halfBody">半身</option><option value="fullBody">全身</option><option value="other">其他</option></select>
                                    <button onClick={()=>setShowExamples(!showExamples)} className="text-[10px] text-blue-500 font-bold mt-2 flex items-center gap-1"><ImageIcon size={12}/> 查看範例</button>
                                    {showExamples && (<div className="grid grid-cols-3 gap-2 mt-2">{(settings.exampleImages?.[form.type] || DEFAULT_EXAMPLES[form.type]).map((src, i) => <img key={i} src={src} className="w-full h-16 object-cover rounded-lg cursor-pointer" onClick={()=>setPreview(src)}/>)}</div>)}
                                </UI.Input>
                                <UI.Input label={`參考圖 (${form.referenceImages.length}/5)`}>
                                    <div className="flex gap-2 flex-wrap">
                                        {form.referenceImages.map((src, i) => <div key={i} className="w-12 h-12 relative"><img src={src} className="w-full h-full object-cover rounded-lg"/><button onClick={()=>setForm(p=>({...p, referenceImages: p.referenceImages.filter((_,idx)=>idx!==i)}))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={10}/></button></div>)}
                                        <label className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-200">{loading?<Loader2 className="animate-spin" size={16}/>:<Plus size={16}/>}<input type="file" multiple hidden onChange={handleImg} disabled={loading}/></label>
                                    </div>
                                </UI.Input>
                                <UI.Input label="需求"><UI.TextArea value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} /></UI.Input>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4"><p className="text-[10px] text-slate-500 mb-2">{settings.tos || "請遵守規定"}</p><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={agreeTOS} onChange={e=>setAgreeTOS(e.target.checked)} className="accent-blue-600"/><span className="text-xs font-bold text-slate-700">我同意條款</span></label></div>
                            </div>
                        )}
                        <UI.Button onClick={handleSubmit} disabled={loading}>{tab === 'login' ? '登入' : tab === 'register' ? '註冊' : tab === 'artist' ? '進入' : '送出'}</UI.Button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- 畫面 2: 委託人儀表板 ---
const ClientDashboard = ({ user, allCommissions, artistPaymentInfo, settings, onLogout, notify }) => {
    const [view, setView] = useState('dashboard');
    const [selected, setSelected] = useState(null);
    const [newReqOpen, setNewReqOpen] = useState(false);
    const [form, setForm] = useState({ contact: '', type: 'avatar', desc: '', paymentType: 'paid', referenceImages: [] });
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [agreeTOS, setAgreeTOS] = useState(false);
    const [showExamples, setShowExamples] = useState(false);
    
    // 篩選器
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const myCommissions = user.isAnonymous 
        ? allCommissions.filter(c => c.code === user.code) 
        : allCommissions.filter(c => c.userName === user.name);

    const filteredList = myCommissions.filter(c => {
        const matchSearch = (c.name||'').includes(search) || (c.code||'').includes(search);
        const matchStatus = statusFilter === 'all' ? true : statusFilter === 'ongoing' ? ['waiting','working'].includes(c.status) : c.status === statusFilter;
        return matchSearch && matchStatus;
    }).sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    const handleImg = async (e) => {
        if (!e.target.files.length) return;
        setLoading(true);
        const urls = [];
        for (const f of e.target.files) { try { urls.push(await smartUpload(f)); } catch {} }
        setForm(p => ({ ...p, referenceImages: [...p.referenceImages, ...urls] }));
        setLoading(false);
    };

    const submitRequest = async () => {
        if (!settings.isOpen) return alert("暫停接單");
        if (!agreeTOS) return alert("請同意條款");
        setLoading(true);
        try {
            await addDoc(collection(db, "commissions"), {
                userName: user.name, name: user.name, contact: form.contact, desc: form.desc, type: form.type,
                code: user.isAnonymous ? user.code : `C${Date.now().toString().slice(-4)}`,
                status: 'pending', paymentType: form.paymentType, updatedAt: new Date().toISOString(),
                referenceImages: form.referenceImages,
                items: { [form.type]: { active: true, progress: 0, price: 0 } },
                timeline: [{ date: new Date().toISOString().split('T')[0], title: '已送出' }]
            });
            notify("申請成功"); setNewReqOpen(false); setForm({ contact: '', type: 'avatar', desc: '', paymentType: 'paid', referenceImages: [] });
        } catch (e) { notify("失敗", 'error'); }
        setLoading(false);
    };

    const uploadProof = async (e) => {
        if(!e.target.files[0]) return;
        try {
            const url = await smartUpload(e.target.files[0]);
            await updateDoc(doc(db, "commissions", selected.id), { paymentProof: url });
            notify("上傳成功");
            setSelected(p => ({...p, paymentProof: url}));
        } catch(e) { notify("上傳失敗", 'error'); }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <UI.Lightbox src={preview} onClose={()=>setPreview(null)}/>
            <nav className="bg-white p-4 shadow-sm flex justify-between items-center sticky top-0 z-40">
                <div className="flex gap-4">
                    <button onClick={()=>setView('dashboard')} className={`font-bold text-sm ${view==='dashboard'?'text-blue-600':''}`}>我的委託</button>
                    <button onClick={()=>setView('messages')} className={`font-bold text-sm ${view==='messages'?'text-blue-600':''}`}>訊息</button>
                </div>
                <button onClick={onLogout} className="text-xs font-bold text-red-400">登出</button>
            </nav>

            <main className="flex-1 p-6 overflow-y-auto">
                {view === 'dashboard' ? (
                    <>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <h2 className="text-2xl font-black">委託管理</h2>
                            {!user.isAnonymous && <button onClick={()=>setNewReqOpen(true)} disabled={!settings.isOpen} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg disabled:opacity-50">{settings.isOpen ? '+ 新委託' : '暫停接單'}</button>}
                        </div>
                        
                        <div className="mb-4 space-y-2">
                            <div className="relative"><Search className="absolute left-3 top-2.5 text-slate-400" size={16}/><input className="w-full bg-white border rounded-xl pl-10 pr-4 py-2 text-xs font-bold outline-none" placeholder="搜尋..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar">{['all','pending','ongoing','done','declined'].map(s => <button key={s} onClick={()=>setStatusFilter(s)} className={`px-3 py-1 rounded-lg text-[10px] font-black whitespace-nowrap ${statusFilter===s?'bg-slate-800 text-white':'bg-white text-slate-400'}`}>{getStatusLabel(s)}</button>)}</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredList.map(c => (
                                <div key={c.id} onClick={()=>setSelected(c)} className={`bg-white p-5 rounded-[2rem] border-2 cursor-pointer hover:shadow-xl transition-all ${c.status==='declined'?'opacity-60 border-slate-200':'border-slate-100'}`}>
                                    <div className="flex justify-between mb-4"><span className="font-black text-lg capitalize">{c.type}</span><UI.StatusBadge status={c.status}/></div>
                                    <div className="text-[10px] font-bold text-slate-300">#{c.code}</div>
                                </div>
                            ))}
                            {filteredList.length === 0 && <div className="col-span-full text-center text-slate-400 text-xs py-10">沒有委託</div>}
                        </div>
                    </>
                ) : (
                    <Messenger commissions={myCommissions} currentUser={user} />
                )}
            </main>

            {isNewReqOpen && (
                <UI.Modal title="發起新委託" onClose={()=>setNewReqOpen(false)}>
                    <div className="space-y-1">
                        <div className="flex gap-2 mb-2">
                            <button onClick={()=>setForm({...form, paymentType: 'paid'})} className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${form.paymentType==='paid'?'border-emerald-200 bg-emerald-50 text-emerald-600':'border-transparent bg-slate-50 text-slate-400'}`}>💰 付費</button>
                            <button onClick={()=>setForm({...form, paymentType: 'free'})} className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${form.paymentType==='free'?'border-pink-200 bg-pink-50 text-pink-500':'border-transparent bg-slate-50 text-slate-400'}`}>🎁 無償</button>
                        </div>
                        <UI.Input label="聯絡方式"><UI.Field value={form.contact} onChange={e=>setForm({...form, contact: e.target.value})} placeholder="Discord ID..."/></UI.Input>
                        <UI.Input label="類別">
                             <select className="w-full bg-transparent font-bold text-sm outline-none" value={form.type} onChange={e=>setForm({...form, type: e.target.value})}>
                                 <option value="avatar">大頭貼</option><option value="halfBody">半身</option><option value="fullBody">全身</option><option value="other">其他</option>
                             </select>
                             <button onClick={()=>setShowExamples(!showExamples)} className="text-[10px] text-blue-500 font-bold mt-2 flex items-center gap-1"><ImageIcon size={12}/> 查看範例</button>
                             {showExamples && <div className="grid grid-cols-3 gap-2 mt-2">{(settings.exampleImages?.[form.type] || DEFAULT_EXAMPLES[form.type] || []).map((src, i) => <img key={i} src={src} className="w-full h-16 object-cover rounded-lg cursor-pointer" onClick={()=>setPreview(src)}/>)}</div>}
                        </UI.Input>
                        <UI.Input label={`參考圖 (${form.referenceImages.length}/5)`}>
                            <div className="flex gap-2 flex-wrap">
                                {form.referenceImages.map((src,i) => <div key={i} className="relative w-12 h-12"><img src={src} className="w-full h-full object-cover rounded-lg"/><button onClick={()=>setForm(p=>({...p, referenceImages: p.referenceImages.filter((_,idx)=>idx!==i)}))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={10}/></button></div>)}
                                <label className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-200">{loading?<Loader2 className="animate-spin" size={16}/>:<Plus size={16}/>}<input type="file" multiple hidden onChange={handleImg} disabled={loading}/></label>
                            </div>
                        </UI.Input>
                        <UI.Input label="需求"><UI.TextArea value={form.desc} onChange={e=>setForm({...form, desc: e.target.value})}/></UI.Input>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4"><p className="text-[10px] text-slate-500 mb-2">{settings.tos || "尚無條款"}</p><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={agreeTOS} onChange={e=>setAgreeTOS(e.target.checked)} className="accent-blue-600"/><span className="text-xs font-bold text-slate-700">我同意</span></label></div>
                        <UI.Button onClick={submitRequest} disabled={loading || !agreeTOS}>送出</UI.Button>
                    </div>
                </UI.Modal>
            )}

            {selected && (
                <UI.Modal title={`委託 #${selected.code}`} onClose={()=>setSelected(null)}>
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">匯款資訊</h4>
                            <p className="text-sm font-bold text-slate-700 whitespace-pre-line mb-3">{artistPaymentInfo || "請等待提供"}</p>
                            <div className="flex gap-2">
                                <label className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-700"><UploadCloud size={14}/> 上傳證明 <input type="file" hidden onChange={uploadProof} /></label>
                                {selected.paymentProof && <button onClick={()=>setPreview(selected.paymentProof)} className="flex-1 bg-emerald-100 text-emerald-600 py-2 rounded-xl text-xs font-bold">查看證明</button>}
                            </div>
                        </div>
                        <div className="flex gap-4"><UI.Input label="進度"><div className="text-xl font-black text-blue-600">{selected.items[selected.type]?.progress}%</div></UI.Input><UI.Input label="金額"><div className="text-xl font-black text-slate-800">${selected.items[selected.type]?.price}</div></UI.Input></div>
                        {selected.referenceImages?.length > 0 && <div className="flex gap-2 overflow-x-auto pb-2">{selected.referenceImages.map((s,i)=><img key={i} src={s} className="w-16 h-16 rounded-lg object-cover cursor-pointer" onClick={()=>setPreview(s)}/>)}</div>}
                        <div className="border rounded-2xl overflow-hidden h-64"><ChatRoom commissionId={selected.id} currentUser={user} status={selected.status} /></div>
                    </div>
                </UI.Modal>
            )}
        </div>
    );
};

// --- 畫面 3: 繪師後台 ---
const ArtistDashboard = ({ commissions, registeredUsers, settings, notify, onLogout }) => {
    const [tab, setTab] = useState('list');
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const [preview, setPreview] = useState(null);
    const [localSettings, setLocalSettings] = useState(settings);
    const [exType, setExType] = useState('avatar');
    const [upEx, setUpEx] = useState(false);

    const stats = useMemo(() => ({
        pending: commissions.filter(c=>c.status==='pending').length,
        working: commissions.filter(c=>['waiting','working'].includes(c.status)).length,
        done: commissions.filter(c=>c.status==='done').length,
        income: commissions.filter(c=>c.status!=='declined' && c.status!=='pending' && c.paymentType!=='free').reduce((acc,c)=>acc+(parseInt(c.items[c.type]?.price)||0),0)
    }), [commissions]);

    const filteredList = commissions.filter(c => {
        const matchSearch = (c.name||'').toLowerCase().includes(search.toLowerCase()) || (c.code||'').toLowerCase().includes(search.toLowerCase());
        const matchStatus = filter==='all' ? c.status!=='pending' : filter==='ongoing' ? ['waiting','working'].includes(c.status) : c.status===filter;
        return matchSearch && matchStatus;
    }).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));

    const requests = commissions.filter(c => c.status==='pending').sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));

    const updateComm = async (id, data) => {
        await updateDoc(doc(db, "commissions", id), { ...data, updatedAt: new Date().toISOString() });
        notify("更新成功"); setSelected(null);
    };

    const handleExUpload = async (e) => {
        setUpEx(true);
        const urls = [];
        for (const f of e.target.files) { try{ urls.push(await smartUpload(f)); }catch{} }
        setLocalSettings(p => ({ ...p, exampleImages: { ...p.exampleImages, [exType]: [...(p.exampleImages?.[exType]||[]), ...urls] } }));
        setUpEx(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            <UI.Lightbox src={preview} onClose={()=>setPreview(null)}/>
            <div className="bg-slate-900 text-white w-full md:w-64 p-6 flex flex-col gap-2 shrink-0">
                <div className="font-black text-2xl mb-8 flex items-center gap-2"><Palette/> ArtistHub</div>
                <button onClick={()=>setTab('list')} className={`p-3 rounded-xl font-bold text-left flex items-center gap-3 ${tab==='list'?'bg-blue-600':'hover:bg-white/10'}`}><List size={18}/> 委託列表</button>
                <button onClick={()=>setTab('reqs')} className={`p-3 rounded-xl font-bold text-left flex items-center gap-3 ${tab==='reqs'?'bg-blue-600':'hover:bg-white/10'}`}><Inbox size={18}/> 請求 ({requests.length})</button>
                <button onClick={()=>setTab('settings')} className={`p-3 rounded-xl font-bold text-left flex items-center gap-3 ${tab==='settings'?'bg-blue-600':'hover:bg-white/10'}`}><Settings size={18}/> 設定</button>
                <button onClick={onLogout} className="p-3 rounded-xl font-bold text-left flex items-center gap-3 hover:bg-red-500/20 text-red-400 mt-auto"><LogOut size={18}/> 登出</button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
                {tab === 'list' && (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {Object.entries(stats).map(([k,v])=><div key={k} className="bg-white p-4 rounded-2xl shadow-sm text-center"><div className="text-2xl font-black">{k==='income'?`$${v}`:v}</div><div className="text-[10px] font-bold text-slate-400 uppercase">{k}</div></div>)}
                        </div>
                        <div className="mb-4 flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-slate-400" size={16}/><input className="w-full bg-white border rounded-xl pl-10 pr-4 py-2 text-xs font-bold outline-none" placeholder="搜尋..." value={search} onChange={e=>setSearch(e.target.value)} /></div></div>
                        <div className="flex gap-2 overflow-x-auto mb-4">{['all','ongoing','done','declined'].map(s=><button key={s} onClick={()=>setFilter(s)} className={`px-3 py-1 rounded-lg text-[10px] font-black whitespace-nowrap ${filter===s?'bg-slate-800 text-white':'bg-white text-slate-400'}`}>{getStatusLabel(s)}</button>)}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredList.map(c => (
                                <div key={c.id} onClick={()=>setSelected(c)} className={`bg-white p-5 rounded-[2rem] border-2 cursor-pointer hover:shadow-xl transition-all ${c.status==='declined'?'opacity-60 border-slate-200':'border-slate-100'}`}>
                                    <div className="flex justify-between mb-4"><span className="font-black text-lg">{c.name}</span><UI.StatusBadge status={c.status}/></div>
                                    <div className="text-[10px] font-bold text-slate-300">#{c.code}</div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {tab === 'reqs' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {requests.length===0 && <div className="col-span-full text-center text-slate-400 font-bold py-10">無待審核請求</div>}
                        {requests.map(c => (
                            <div key={c.id} onClick={()=>setSelected(c)} className="bg-white p-5 rounded-[2rem] border-2 border-pink-200 cursor-pointer hover:shadow-xl transition-all relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-pink-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl">NEW</div>
                                <div className="font-black text-lg mb-2">{c.name}</div>
                                <div className="text-xs text-slate-500 mb-2">{c.type} • {c.paymentType==='free'?'無償':'付費'}</div>
                                <div className="text-xs text-slate-400 line-clamp-2">{c.desc}</div>
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'settings' && (
                    <div className="max-w-xl mx-auto space-y-4">
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm">
                            <h3 className="font-black text-lg mb-4 flex items-center gap-2"><Power size={18}/> 接單開關</h3>
                            <label className="flex items-center gap-3 cursor-pointer"><div className={`w-12 h-6 rounded-full p-1 transition-colors ${localSettings.isOpen?'bg-emerald-500':'bg-slate-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${localSettings.isOpen?'translate-x-6':''}`}></div></div><span className="font-bold text-slate-700">{localSettings.isOpen?'Open':'Closed'}</span><input type="checkbox" hidden checked={localSettings.isOpen} onChange={e=>setLocalSettings({...localSettings, isOpen:e.target.checked})}/></label>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm">
                            <h3 className="font-black text-lg mb-4">範例圖管理</h3>
                            <select className="w-full mb-4 p-2 bg-slate-50 rounded-xl font-bold text-sm outline-none" value={exType} onChange={e=>setExType(e.target.value)}><option value="avatar">大頭貼</option><option value="halfBody">半身</option><option value="fullBody">全身</option><option value="other">其他</option></select>
                            <div className="grid grid-cols-3 gap-2 mb-4">{(localSettings.exampleImages?.[exType]||[]).map((url,i)=><div key={i} className="relative group w-full h-20"><img src={url} className="w-full h-full object-cover rounded-xl"/><button onClick={()=>{const n={...localSettings.exampleImages};n[exType]=n[exType].filter((_,x)=>x!==i);setLocalSettings({...localSettings,exampleImages:n})}} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"><X size={10}/></button></div>)}<label className="w-full h-20 bg-slate-50 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer">{upEx?<Loader2 className="animate-spin"/>:<Plus/>}<input type="file" multiple hidden onChange={handleExUpload} disabled={upEx}/></label></div>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm space-y-4">
                            <UI.Input label="TOS"><UI.TextArea value={localSettings.tos||''} onChange={e=>setLocalSettings({...localSettings,tos:e.target.value})}/></UI.Input>
                            <UI.Input label="匯款資訊"><UI.TextArea value={localSettings.paymentInfo||''} onChange={e=>setLocalSettings({...localSettings,paymentInfo:e.target.value})}/></UI.Input>
                            <UI.Input label="管理密碼"><UI.Field type="password" value={localSettings.password} onChange={e=>setLocalSettings({...localSettings,password:e.target.value})}/></UI.Input>
                        </div>
                        <UI.Button onClick={async ()=>{ await setDoc(doc(db, "settings", "admin_config"), localSettings); notify("儲存成功"); }}>儲存所有設定</UI.Button>
                    </div>
                )}
            </div>

            {selected && (
                <UI.Modal title={`管理 #${selected.code}`} onClose={()=>setSelected(null)}>
                    <div className="space-y-4">
                         <div className="flex gap-2">
                             <div className="flex-1 bg-slate-50 p-3 rounded-xl"><span className="text-[10px] text-slate-400 block font-black">狀態</span><select className="bg-transparent font-bold text-sm w-full outline-none" value={selected.status} onChange={e=>setSelected({...selected, status:e.target.value})}><option value="pending">待核准</option><option value="waiting">排單中</option><option value="working">進行中</option><option value="done">已完成</option><option value="declined">婉拒</option></select></div>
                             <div className="flex-1 bg-slate-50 p-3 rounded-xl"><span className="text-[10px] text-slate-400 block font-black">金額</span><input type="number" className="bg-transparent font-bold text-sm w-full outline-none" value={selected.items[selected.type]?.price} onChange={e=>{const i={...selected.items};i[selected.type].price=e.target.value;setSelected({...selected,items:i})}}/></div>
                             <div className="flex-1 bg-slate-50 p-3 rounded-xl"><span className="text-[10px] text-slate-400 block font-black">進度 %</span><input type="number" className="bg-transparent font-bold text-sm w-full outline-none" value={selected.items[selected.type]?.progress} onChange={e=>{const i={...selected.items};i[selected.type].progress=e.target.value;setSelected({...selected,items:i})}}/></div>
                         </div>
                         <div className="bg-slate-50 p-3 rounded-xl"><span className="text-[10px] text-slate-400 block font-black mb-1">參考圖</span><div className="flex gap-2 overflow-x-auto">{selected.referenceImages?.map((s,i)=><img key={i} src={s} className="w-12 h-12 rounded-lg object-cover cursor-pointer" onClick={()=>setPreview(s)}/>)}</div></div>
                         {selected.paymentProof && <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex justify-between items-center"><span className="text-xs font-bold text-emerald-700 flex items-center gap-1"><CheckCircle2 size={14}/> 已上傳匯款證明</span><button onClick={()=>setPreview(selected.paymentProof)} className="text-[10px] bg-white px-2 py-1 rounded border border-emerald-200 font-bold text-emerald-600">查看</button></div>}
                         <div className="h-64 border rounded-xl overflow-hidden"><ChatRoom commissionId={selected.id} currentUser={{name:'繪師', role:'artist'}} status={selected.status}/></div>
                         <div className="flex gap-2 pt-2"><UI.Button variant="ghost" onClick={()=>{if(confirm('確定婉拒？')) updateComm(selected.id, {status:'declined'})}}>婉拒</UI.Button><UI.Button onClick={()=>updateComm(selected.id, selected)}>儲存更新</UI.Button></div>
                    </div>
                </UI.Modal>
            )}
        </div>
    );
};

// --- App Root ---
const App = () => {
    const [user, setUser] = useState(null);
    const [comms, setComms] = useState([]);
    const [users, setUsers] = useState([]);
    const [settings, setSettings] = useState({ isOpen: true, exampleImages: DEFAULT_EXAMPLES });
    const [notify, setNotify] = useState(null);

    useEffect(() => {
        if(!db) return;
        const u1 = onSnapshot(query(collection(db, "commissions"), orderBy("updatedAt", "desc")), s => setComms(s.docs.map(d=>({id:d.id,...d.data()}))));
        const u2 = onSnapshot(collection(db, "users"), s => setUsers(s.docs.map(d=>({id:d.id,...d.data()}))));
        const u3 = onSnapshot(doc(db, "settings", "admin_config"), s => { if(s.exists()) setSettings(p=>({...p,...s.data()})); else setDoc(doc(db, "settings", "admin_config"), settings); });
        return () => { u1(); u2(); u3(); };
    }, []);

    const showNotify = (msg, type='success') => { setNotify({msg, type}); setTimeout(()=>setNotify(null), 3000); };
    
    const handleAuth = async (mode, data) => {
        if (mode === 'artist') {
            if (data.password === settings.password) setUser({ name: 'Admin', role: 'artist' });
            else showNotify('密碼錯誤', 'error');
        } else if (mode === 'anonymous_track') {
            const found = comms.find(c => c.code === data.code && c.password === data.password);
            if (found) setUser({ name: found.userName, role: 'client', isAnonymous: true, code: data.code });
            else showNotify('查無此單', 'error');
        } else if (mode === 'login') {
            const found = users.find(u => u.name === data.name && u.password === data.password);
            if (found) setUser({ name: found.name, role: 'client' });
            else showNotify('帳密錯誤', 'error');
        } else if (mode === 'register') {
            if (users.find(u => u.name === data.name)) showNotify('名稱已存在', 'error');
            else { await setDoc(doc(db, "users", data.name), data); setUser({ name: data.name, role: 'client' }); }
        }
    };

    return (
        <div className="font-sans text-slate-800">
            {notify && <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-xl font-bold flex items-center gap-2 ${notify.type==='error'?'bg-red-500 text-white':'bg-emerald-500 text-white'}`}>{notify.type==='error'?<AlertCircle size={18}/>:<CheckCircle2 size={18}/>}{notify.msg}</div>}
            {!user && <LoginView onAuth={handleAuth} settings={settings} onAnonymousRequest={async (d) => { try{ await addDoc(collection(db, "commissions"), {...d, code: d.code, userName: d.name, status: 'pending', items: {[d.type]:{price:0, progress:0, active:true}}, updatedAt: new Date().toISOString()}); showNotify("申請成功！請記住編號密碼"); }catch(e){showNotify("失敗", 'error')} }} />}
            {user?.role === 'client' && <ClientDashboard user={user} allCommissions={comms} artistPaymentInfo={settings.paymentInfo} settings={settings} isCommissionOpen={settings.isOpen} tos={settings.tos} exampleImages={settings.exampleImages} onLogout={()=>setUser(null)} notify={showNotify} />}
            {user?.role === 'artist' && <ArtistDashboard commissions={comms} registeredUsers={users} artistSettings={settings} notify={showNotify} onLogout={()=>setUser(null)} />}
        </div>
    );
};

export default App;