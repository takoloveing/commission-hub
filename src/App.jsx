import React, { useState, useEffect } from 'react';
import { 
  Palette, User, Lock, LayoutGrid, CheckCircle2, 
  AlertCircle, Clock, Sparkles, LogOut, Plus, 
  Edit3, Trash2, MessageCircle, ChevronRight, 
  Save, X, Activity, Image as ImageIcon, DollarSign, CreditCard, 
  Wallet, ShieldCheck, Camera, History, FileText, Download, Cloud
} from 'lucide-react';

// --- 引入 Firebase ---
// 請確保 src 資料夾下有 firebase.js 檔案，並且已經填入正確的設定
import { db } from './firebase'; 
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

// 這是備用的初始資料 (只在第一次上傳到雲端時使用)
const MOCK_DATA = [
  {
    name: '星野',
    code: 'STAR01',
    status: 'working',
    note: '線稿精修中，附上目前的黑白草圖供確認。',
    items: {
      avatar: { active: true, progress: 100, price: 1500, payment: 'full', preview: 'https://images.unsplash.com/photo-1544511916-0148ccdeb877?w=500&auto=format&fit=crop&q=60' }, 
      halfBody: { active: true, progress: 65, price: 3000, payment: 'deposit', preview: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500&auto=format&fit=crop&q=60' },
      fullBody: { active: false, progress: 0, price: 5000, payment: 'none', preview: '' },
    },
    timeline: [
      { date: '2024-02-14', title: '線稿進度更新', desc: '半身立繪線稿已完成 65%' },
    ],
    updatedAt: '2024-02-14'
  }
];

const GlobalAnnouncement = "🌊 系統升級：資料已連接雲端，繪師更新後您會即時看到！";

const PAYMENT_STATUS = {
  none: { label: '未付款', color: 'text-slate-400', bg: 'bg-slate-100', icon: Wallet },
  deposit: { label: '已付訂金', color: 'text-amber-500', bg: 'bg-amber-50', icon: CreditCard },
  full: { label: '已全額付清', color: 'text-emerald-500', bg: 'bg-emerald-50', icon: ShieldCheck },
};

// --- 主應用程式 ---
const App = () => {
  const [view, setView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [commissions, setCommissions] = useState([]); // 改成空陣列，等待從雲端抓資料
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  // 監聽雲端資料庫變化 (Real-time)
  useEffect(() => {
    // 建立查詢：從 'commissions' 集合抓取資料，並依照 updatedAt 排序
    const q = query(collection(db, "commissions"), orderBy("updatedAt", "desc"));
    
    // 開啟即時監聽
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setCommissions(data);
      setLoading(false);
    }, (error) => {
      console.error("Firebase 連線錯誤:", error);
      showNotification("資料庫連線失敗，請檢查 firebase.js 設定", "error");
      setLoading(false);
    });

    // 組件卸載時取消監聽
    return () => unsubscribe();
  }, []);

  // 上傳初始資料到雲端 (僅供第一次使用)
  const uploadInitialData = async () => {
    try {
      for (const item of MOCK_DATA) {
        await addDoc(collection(db, "commissions"), item);
      }
      showNotification('初始資料上傳成功！');
    } catch (e) {
      console.error(e);
      showNotification('上傳失敗: ' + e.message, 'error');
    }
  };

  const handleLogin = (role, data) => {
    if (role === 'artist') {
      if (data.password === 'admin') { 
        setView('artist');
      } else {
        showNotification('密碼錯誤', 'error');
      }
    } else if (role === 'client') {
      const target = commissions.find(c => c.name === data.name && c.code === data.code);
      if (target) {
        setCurrentUser(target);
        setView('client');
      } else {
        showNotification('找不到資料，請確認名稱與編號', 'error');
      }
    }
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-blue-600 font-bold">資料庫連線中...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-sky-200 selection:text-blue-900">
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl shadow-blue-900/10 flex items-center gap-3 animate-in slide-in-from-top-4 backdrop-blur-md border ${notification.type === 'error' ? 'bg-red-50/90 border-red-200 text-red-600' : 'bg-emerald-50/90 border-emerald-200 text-emerald-600'}`}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span className="font-medium">{notification.msg}</span>
        </div>
      )}

      {view === 'login' && <LoginView onLogin={handleLogin} commissions={commissions} onUpload={uploadInitialData} />}
      
      {view === 'client' && (
        <ClientDashboard 
          user={currentUser} 
          data={commissions.find(c => c.id === currentUser.id)}
          onLogout={() => { setView('login'); setCurrentUser(null); }} 
        />
      )}
      
      {view === 'artist' && (
        <ArtistDashboard 
          commissions={commissions} 
          notify={showNotification}
          onLogout={() => setView('login')}
        />
      )}
    </div>
  );
};

// --- 登入介面 ---
const LoginView = ({ onLogin, commissions, onUpload }) => {
  const [activeTab, setActiveTab] = useState('client');
  const [formData, setFormData] = useState({ name: '', code: '', password: '' });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-sky-300/20 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[2.5rem] shadow-2xl shadow-blue-900/10 overflow-hidden">
          <div className="pt-10 pb-6 px-8 text-center bg-gradient-to-b from-blue-50/50 to-transparent">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-sky-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30 transform rotate-3">
              <Palette size={36} className="text-white drop-shadow-md" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Commission<span className="text-blue-500">Hub</span></h1>
            <p className="text-slate-500 mt-2 font-medium">Cloud Database Connected</p>
          </div>

          <div className="flex p-2 mx-8 bg-slate-100/80 rounded-2xl mb-6">
            <button onClick={() => setActiveTab('client')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'client' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>委託查詢</button>
            <button onClick={() => setActiveTab('artist')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'artist' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>繪師後台</button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); onLogin(activeTab, formData); }} className="px-8 pb-10 space-y-5">
            {activeTab === 'client' ? (
              <>
                <input required type="text" placeholder="您的名稱" className="w-full pl-4 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <input required type="text" placeholder="查詢編號 (ex: STAR01)" className="w-full pl-4 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
              </>
            ) : (
              <input required type="password" placeholder="管理密碼 (admin)" className="w-full pl-4 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            )}
            <button type="submit" className="w-full py-4 rounded-2xl font-bold text-white shadow-lg shadow-blue-500/30 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 active:scale-[0.98] transition-all">
              {activeTab === 'client' ? '查詢進度' : '進入後台'}
            </button>
          </form>
          
          {/* 初始化按鈕：如果資料庫是空的，顯示這個按鈕 */}
          {commissions.length === 0 && (
            <div className="px-8 pb-8 text-center">
              <p className="text-xs text-slate-400 mb-2">資料庫目前是空的</p>
              <button type="button" onClick={onUpload} className="text-xs flex items-center justify-center gap-1 mx-auto text-blue-500 hover:underline">
                <Cloud size={12}/> 上傳測試資料 (星野)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- 2. 委託人儀表板 ---
const ClientDashboard = ({ user, data, onLogout }) => {
  if (!data) return <div className="p-10 text-center">資料讀取錯誤或已被刪除 <button onClick={onLogout} className="underline">登出</button></div>;

  const activeItems = Object.entries(data.items).filter(([_, item]) => item.active);
  const [activeTab, setActiveTab] = useState(activeItems.length > 0 ? activeItems[0][0] : null);
  const [showReceipt, setShowReceipt] = useState(false);

  const tabLabels = { avatar: '大頭貼', halfBody: '半身插畫', fullBody: '全身立繪' };
  const tabIcons = { avatar: User, halfBody: ImageIcon, fullBody: Activity };
  const totalAmount = Object.values(data.items).reduce((acc, curr) => curr.active ? acc + curr.price : acc, 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Palette size={18} />
            </div>
            <span className="font-bold text-slate-800 hidden sm:block">CommissionHub</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowReceipt(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-bold transition-all">
              <FileText size={16} /> 收據
            </button>
            <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 rounded-full text-slate-500 hover:bg-slate-100 text-sm font-medium">
              <LogOut size={16} /> 登出
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-sky-500 text-white p-4 rounded-2xl shadow-lg flex items-center gap-3">
          <Sparkles size={18} />
          <p className="text-sm font-medium">{GlobalAnnouncement}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden">
               <div className="relative z-10">
                 <h1 className="text-3xl font-bold text-slate-800 mb-2">Hi, {data.name}</h1>
                 <p className="text-slate-500 mb-4">這裡是您的委託進度中心</p>
                 <StatusBadge status={data.status} />
               </div>
               <div className="absolute right-[-20px] top-[-20px] w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
            </div>

            {activeItems.length > 0 ? (
              <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden min-h-[500px]">
                <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar">
                  {activeItems.map(([key, _]) => {
                    const Icon = tabIcons[key];
                    return (
                      <button key={key} onClick={() => setActiveTab(key)} className={`flex-1 py-4 px-6 font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap transition-all border-b-2 ${activeTab === key ? 'text-blue-600 border-blue-600 bg-blue-50/30' : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50'}`}>
                        <Icon size={18} /> {tabLabels[key]}
                      </button>
                    );
                  })}
                </div>
                <div className="p-8 animate-in fade-in" key={activeTab}>
                   {(() => {
                     const currentItem = data.items[activeTab];
                     const statusInfo = PAYMENT_STATUS[currentItem.payment];
                     const StatusIcon = statusInfo.icon;
                     return (
                       <div className="space-y-8">
                         <div className="flex flex-col sm:flex-row gap-4">
                           <div className={`flex-1 p-4 rounded-2xl border ${currentItem.payment === 'full' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                              <span className="text-xs font-bold text-slate-400 uppercase">Amount</span>
                              <div className="flex items-center gap-1 mt-1"><DollarSign size={16}/><span className="text-2xl font-bold">{currentItem.price.toLocaleString()}</span></div>
                           </div>
                           <div className={`flex-1 p-4 rounded-2xl border ${statusInfo.bg} border-transparent`}>
                              <span className={`text-xs font-bold uppercase opacity-60 ${statusInfo.color}`}>Payment</span>
                              <div className={`flex items-center gap-2 mt-1 font-bold ${statusInfo.color}`}><StatusIcon size={20}/>{statusInfo.label}</div>
                           </div>
                         </div>
                         <div>
                            <span className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                              <Camera size={16} /> 當前預覽
                            </span>
                            <div className="aspect-video w-full bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative group">
                              {currentItem.preview ? (
                                <>
                                  <img src={currentItem.preview} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                    <p className="text-white text-xs font-medium">僅供進度確認，請勿外流</p>
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                  <ImageIcon size={48} className="mb-2 opacity-50" />
                                  <span className="text-sm">尚未上傳預覽圖</span>
                                </div>
                              )}
                            </div>
                         </div>
                         <div>
                           <div className="flex justify-between items-end mb-2">
                             <span className="font-bold text-slate-700">Completion</span>
                             <span className="text-xl font-bold text-blue-600">{currentItem.progress}%</span>
                           </div>
                           <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                             <div className={`h-full rounded-full transition-all duration-1000 ${currentItem.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${currentItem.progress}%` }}></div>
                           </div>
                         </div>
                       </div>
                     );
                   })()}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-slate-200"><p className="text-slate-400">尚無項目</p></div>
            )}
          </div>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
               <div className="flex items-center gap-2 mb-4 text-blue-600"><MessageCircle size={20} /><h3 className="font-bold">Artist Note</h3></div>
               <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl">{data.note || "暫無備註"}</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm max-h-[500px] overflow-y-auto custom-scrollbar">
               <div className="flex items-center gap-2 mb-6 text-slate-800"><History size={20} /><h3 className="font-bold">Activity Log</h3></div>
               <div className="relative pl-4 space-y-8">
                  <div className="absolute left-[23px] top-2 bottom-2 w-[2px] bg-slate-100"></div>
                  {data.timeline && data.timeline.length > 0 ? data.timeline.map((event, idx) => (
                    <div key={idx} className="relative pl-8 animate-in slide-in-from-left-2 delay-100">
                       <div className="absolute left-[19px] top-1.5 w-2.5 h-2.5 bg-blue-500 rounded-full ring-4 ring-white z-10"></div>
                       <span className="text-xs font-mono text-slate-400 block mb-1">{event.date}</span>
                       <h4 className="font-bold text-slate-800 text-sm">{event.title}</h4>
                       <p className="text-xs text-slate-500 mt-1">{event.desc}</p>
                    </div>
                  )) : <p className="text-slate-400 text-sm text-center">尚無活動紀錄</p>}
               </div>
            </div>
          </div>
        </div>
      </main>
      {showReceipt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-slate-900 text-white p-6 text-center relative">
              <button onClick={() => setShowReceipt(false)} className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full"><X size={20}/></button>
              <h2 className="text-xl font-bold tracking-widest">RECEIPT</h2>
              <p className="text-slate-400 text-xs mt-1">CommissionHub Official</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex justify-between border-b border-slate-100 pb-4">
                 <div><p className="text-xs text-slate-400 uppercase">Client</p><p className="font-bold text-slate-800">{data.name}</p></div>
                 <div className="text-right"><p className="text-xs text-slate-400 uppercase">Date</p><p className="font-bold text-slate-800">{data.updatedAt}</p></div>
              </div>
              <div className="space-y-3">
                 {Object.entries(data.items).filter(([_, i]) => i.active).map(([key, i]) => (
                   <div key={key} className="flex justify-between text-sm">
                     <span className="text-slate-600 capitalize">{tabLabels[key]}</span>
                     <span className="font-mono font-medium">${i.price.toLocaleString()}</span>
                   </div>
                 ))}
              </div>
              <div className="border-t border-slate-900 pt-4 flex justify-between items-end"><span className="font-bold text-slate-900">Total</span><span className="text-2xl font-bold text-slate-900">${totalAmount.toLocaleString()}</span></div>
              <button className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 mt-4 hover:bg-blue-700">
                <Download size={18} /> 下載收據 (PDF)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 3. 繪師後台 (雲端寫入版) ---
const ArtistDashboard = ({ commissions, notify, onLogout }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const openModal = (item = null) => {
    setEditingItem(item ? JSON.parse(JSON.stringify(item)) : {
      name: '', code: '', status: 'waiting', note: '',
      items: {
        avatar: { active: false, progress: 0, price: 0, payment: 'none', preview: '' },
        halfBody: { active: false, progress: 0, price: 0, payment: 'none', preview: '' },
        fullBody: { active: false, progress: 0, price: 0, payment: 'none', preview: '' },
      },
      timeline: [],
      updatedAt: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  // 儲存到 Firebase
  const handleSave = async (data) => {
    try {
      const newTimelineEvent = {
        date: new Date().toISOString().split('T')[0],
        title: '系統更新',
        desc: '委託進度或狀態已更新'
      };
      const dataToSave = {
        ...data,
        timeline: [newTimelineEvent, ...(data.timeline || [])],
        updatedAt: new Date().toISOString().split('T')[0]
      };

      if (data.id) {
        // 更新現有
        await updateDoc(doc(db, "commissions", data.id), dataToSave);
        notify('雲端資料已更新');
      } else {
        // 新增
        await addDoc(collection(db, "commissions"), dataToSave);
        notify('新委託已上傳雲端');
      }
      setIsModalOpen(false);
    } catch (e) {
      notify('儲存失敗: ' + e.message, 'error');
    }
  };

  // 從 Firebase 刪除
  const handleDelete = async (id) => {
    if (confirm('確定要從雲端刪除嗎？無法復原。')) {
      try {
        await deleteDoc(doc(db, "commissions", id));
        notify('資料已刪除');
      } catch (e) {
        notify('刪除失敗', 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <nav className="bg-slate-900 text-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2"><LayoutGrid size={20} className="text-blue-400" /><span className="font-bold">Artist Studio (Cloud)</span></div>
          <button onClick={onLogout} className="text-slate-400 hover:text-white text-sm">登出</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">委託管理</h2>
          <button onClick={() => openModal()} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all"><Plus size={18} /> 新增</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {commissions.map(item => (
            <div key={item.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div><h3 className="font-bold text-lg text-slate-800">{item.name}</h3><span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{item.code}</span></div>
                <StatusBadge status={item.status} mini />
              </div>
              <div className="space-y-2 mb-6">
                {Object.entries(item.items).filter(([_, i]) => i.active).map(([key, i]) => (
                  <div key={key} className="flex justify-between text-xs items-center bg-slate-50 p-2 rounded-lg">
                    <span className="font-medium text-slate-600 capitalize">{key}</span>
                    <div className="flex items-center gap-2"><span className={`w-1.5 h-1.5 rounded-full ${i.preview ? 'bg-emerald-500' : 'bg-slate-300'}`}></span><span className="font-bold text-blue-600">{i.progress}%</span></div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openModal(item)} className="flex-1 py-2 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl flex items-center justify-center gap-2 transition-colors"><Edit3 size={16} /> 編輯</button>
                <button onClick={() => handleDelete(item.id)} className="px-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      </main>
      {isModalOpen && <EditModal data={editingItem} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
    </div>
  );
};

// --- 組件: 編輯視窗 (維持不變) ---
const EditModal = ({ data, onClose, onSave }) => {
  const [form, setForm] = useState(data);
  const [tab, setTab] = useState('info'); 

  const updateItem = (key, field, value) => {
    setForm({ ...form, items: { ...form.items, [key]: { ...form.items[key], [field]: value } } });
  };
  const toggleActive = (key) => updateItem(key, 'active', !form.items[key].active);
  const tabs = [{ id: 'info', label: '基本' }, { id: 'avatar', label: '大頭' }, { id: 'halfBody', label: '半身' }, { id: 'fullBody', label: '全身' }];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0"><h3 className="font-bold text-lg text-slate-800">編輯委託</h3><button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={20} /></button></div>
        <div className="flex p-2 bg-white border-b border-slate-100 shrink-0">{tabs.map(t => (<button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${tab === t.id ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>{t.label}</button>))}</div>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {tab === 'info' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4"><div><label className="label">名稱</label><input type="text" className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div><div><label className="label">編號</label><input type="text" className="input font-mono" value={form.code} onChange={e => setForm({...form, code: e.target.value})} /></div></div>
              <div><label className="label">狀態</label><div className="flex bg-slate-100 p-1 rounded-xl">{['waiting', 'working', 'done'].map(s => (<button key={s} onClick={() => setForm({...form, status: s})} className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${form.status === s ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{s}</button>))}</div></div>
              <div><label className="label">備註</label><textarea className="input resize-none" rows="3" value={form.note} onChange={e => setForm({...form, note: e.target.value})}></textarea></div>
            </div>
          )}
          {['avatar', 'halfBody', 'fullBody'].includes(tab) && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100"><span className="font-bold text-slate-700">啟用此項目</span><button onClick={() => toggleActive(tab)} className={`w-12 h-7 rounded-full transition-colors relative ${form.items[tab].active ? 'bg-blue-500' : 'bg-slate-300'}`}><span className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${form.items[tab].active ? 'translate-x-5' : ''}`}></span></button></div>
              {form.items[tab].active && (
                <div className="space-y-5 animate-in slide-in-from-top-2">
                   <div><label className="label">進度 ({form.items[tab].progress}%)</label><input type="range" min="0" max="100" className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500" value={form.items[tab].progress} onChange={e => updateItem(tab, 'progress', parseInt(e.target.value))} /></div>
                   <div className="grid grid-cols-2 gap-4"><div><label className="label">金額</label><input type="number" className="input" value={form.items[tab].price} onChange={e => updateItem(tab, 'price', parseInt(e.target.value) || 0)} /></div><div><label className="label">付款</label><select className="input" value={form.items[tab].payment} onChange={e => updateItem(tab, 'payment', e.target.value)}><option value="none">未付款</option><option value="deposit">訂金</option><option value="full">付清</option></select></div></div>
                   <div><label className="label">預覽圖連結 (URL)</label><input type="text" className="input text-xs" placeholder="https://..." value={form.items[tab].preview || ''} onChange={e => updateItem(tab, 'preview', e.target.value)} /><p className="text-[10px] text-slate-400 mt-1">請貼上圖片網址</p></div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-100 flex gap-3 shrink-0 bg-white"><button onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors">取消</button><button onClick={() => onSave(form)} className="flex-[2] bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20">儲存並更新</button></div>
      </div>
    </div>
  );
};

// --- Helper (維持不變) ---
const StatusBadge = ({ status, mini }) => {
  const config = { waiting: { bg: 'bg-slate-100', text: 'text-slate-500', label: '排單中', icon: Clock }, working: { bg: 'bg-blue-50', text: 'text-blue-600', label: '繪製中', icon: Activity }, done: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: '已完成', icon: CheckCircle2 } };
  const { bg, text, label, icon: Icon } = config[status];
  if (mini) return <span className={`${bg} ${text} p-1.5 rounded-lg`}><Icon size={14} /></span>;
  return <span className={`${bg} ${text} rounded-full font-bold px-4 py-2 text-sm flex items-center gap-2 border border-white shadow-sm`}><Icon size={16} /> {label}</span>;
};
const styles = `.label { @apply block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2; } .input { @apply w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700; } .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`;
export default App;