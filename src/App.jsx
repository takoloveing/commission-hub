import React, { useState, useEffect } from 'react';
import { 
  Palette, User, Lock, LayoutGrid, CheckCircle2, 
  AlertCircle, Clock, Sparkles, LogOut, Plus, 
  Edit3, Trash2, MessageCircle, ChevronRight, 
  Save, X, Activity, Image as ImageIcon, DollarSign, CreditCard, 
  Wallet, ShieldCheck, Camera, History, FileText, Download, Cloud,
  Mail, Send, FileQuestion
} from 'lucide-react';

// --- 引入 Firebase ---
// 請確保 src 資料夾下有 firebase.js 檔案，並且已經填入正確的設定
import { db } from './firebase'; 
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

const GlobalAnnouncement = "🌊 系統升級：介面排版優化，操作更舒適！";

const PAYMENT_STATUS = {
  none: { label: '未付款', color: 'text-slate-400', bg: 'bg-slate-100', icon: Wallet },
  deposit: { label: '已付訂金', color: 'text-amber-500', bg: 'bg-amber-50', icon: CreditCard },
  full: { label: '已全額付清', color: 'text-emerald-500', bg: 'bg-emerald-50', icon: ShieldCheck },
};

// --- 主應用程式 ---
const App = () => {
  const [view, setView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [commissions, setCommissions] = useState([]); 
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  // 監聽雲端資料庫
  useEffect(() => {
    const q = query(collection(db, "commissions"), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setCommissions(data);
      setLoading(false);
    }, (error) => {
      console.error("Firebase Error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (role, data) => {
    if (role === 'artist') {
      if (data.password === 'admin') { 
        setView('artist');
      } else {
        showNotification('密碼錯誤', 'error');
      }
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

  // 處理發起新委託
  const handleNewRequest = async (requestData) => {
    try {
      const newCommission = {
        ...requestData,
        code: 'PENDING',
        status: 'pending',
        note: '您的委託已送出，繪師審核中。請留意您的聯絡信箱/方式。',
        items: {
          avatar: { active: requestData.type === 'avatar', progress: 0, price: 0, payment: 'none', preview: '' },
          halfBody: { active: requestData.type === 'halfBody', progress: 0, price: 0, payment: 'none', preview: '' },
          fullBody: { active: requestData.type === 'fullBody', progress: 0, price: 0, payment: 'none', preview: '' },
        },
        timeline: [
          { date: new Date().toISOString().split('T')[0], title: '委託申請', desc: '已送出委託申請，等待繪師確認。' }
        ],
        updatedAt: new Date().toISOString().split('T')[0]
      };

      await addDoc(collection(db, "commissions"), newCommission);
      showNotification('委託申請已送出！請等待繪師聯繫。');
    } catch (e) {
      showNotification('申請失敗: ' + e.message, 'error');
    }
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

      {view === 'login' && <LoginView onLogin={handleLogin} onRequest={handleNewRequest} />}
      
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

// --- 1. 登入介面 ---
const LoginView = ({ onLogin, onRequest }) => {
  const [activeTab, setActiveTab] = useState('client');
  const [formData, setFormData] = useState({ name: '', code: '', password: '' });
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

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

          <div className="flex p-2 mx-8 bg-slate-100/80 rounded-2xl mb-8">
            <button onClick={() => setActiveTab('client')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'client' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>查詢進度</button>
            <button onClick={() => setActiveTab('artist')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'artist' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>繪師後台</button>
          </div>

          {/* 調整間距：space-y-6 (原本是 5) */}
          <form onSubmit={(e) => { e.preventDefault(); onLogin(activeTab, formData); }} className="px-8 pb-10 space-y-6">
            {activeTab === 'client' ? (
              <>
                <div>
                  <label className="label">委託人名稱</label>
                  <input required type="text" placeholder="您的名稱" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="label">查詢編號</label>
                  <input required type="text" placeholder="ex: STAR01" className="input-field" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
                </div>
              </>
            ) : (
              <div>
                <label className="label">管理密碼</label>
                <input required type="password" placeholder="admin" className="input-field" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
            )}
            <button type="submit" className="w-full py-4 rounded-2xl font-bold text-white shadow-lg bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 active:scale-[0.98] transition-all">
              {activeTab === 'client' ? '查詢進度' : '進入後台'}
            </button>
          </form>

          {activeTab === 'client' && (
            <div className="px-8 pb-10">
              <div className="relative flex py-4 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium">還沒有委託嗎？</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>
              <button 
                onClick={() => setIsRequestModalOpen(true)}
                className="w-full py-3.5 rounded-2xl font-bold text-pink-500 border-2 border-pink-100 bg-pink-50 hover:bg-pink-100 hover:border-pink-200 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={18} /> 我要委託
              </button>
            </div>
          )}
        </div>
      </div>

      {isRequestModalOpen && (
        <RequestModal onClose={() => setIsRequestModalOpen(false)} onSubmit={onRequest} />
      )}
    </div>
  );
};

// --- 新增：委託申請表單 (間距加大版) ---
const RequestModal = ({ onClose, onSubmit }) => {
  const [form, setForm] = useState({ name: '', contact: '', type: 'avatar', desc: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-8 my-8">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-bold text-2xl text-slate-800 flex items-center gap-2">
            <Mail className="text-pink-500" /> 委託申請
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
        </div>
        {/* 調整間距：space-y-6 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="label">您的暱稱</label>
            <input required type="text" className="input-field" placeholder="ex: 星野" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div>
            <label className="label">聯絡方式 (Email/Discord/Twitter)</label>
            <input required type="text" className="input-field" placeholder="方便繪師聯繫您" value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} />
          </div>
          <div>
            <label className="label">委託項目</label>
            <select className="input-field" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
              <option value="avatar">大頭貼</option>
              <option value="halfBody">半身插畫</option>
              <option value="fullBody">全身立繪</option>
            </select>
          </div>
          <div>
            <label className="label">需求簡述</label>
            <textarea className="input-field resize-none h-32" placeholder="請描述您的角色特徵、構圖想法..." value={form.desc} onChange={e => setForm({...form, desc: e.target.value})}></textarea>
          </div>
          <button type="submit" className="w-full py-4 bg-pink-500 text-white font-bold rounded-2xl hover:bg-pink-600 transition-all shadow-lg shadow-pink-200 mt-4 flex items-center justify-center gap-2">
            <Send size={20} /> 送出申請
          </button>
        </form>
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
                         <div className="flex flex-col sm:flex-row gap-6">
                           <div className={`flex-1 p-5 rounded-2xl border ${currentItem.payment === 'full' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                              <span className="text-xs font-bold text-slate-400 uppercase">Amount</span>
                              <div className="flex items-center gap-1 mt-2"><DollarSign size={18}/><span className="text-3xl font-bold">{currentItem.price.toLocaleString()}</span></div>
                           </div>
                           <div className={`flex-1 p-5 rounded-2xl border ${statusInfo.bg} border-transparent`}>
                              <span className={`text-xs font-bold uppercase opacity-60 ${statusInfo.color}`}>Payment</span>
                              <div className={`flex items-center gap-2 mt-2 font-bold text-lg ${statusInfo.color}`}><StatusIcon size={22}/>{statusInfo.label}</div>
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
                           <div className="flex justify-between items-end mb-3">
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
              <div className="space-y-4">
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

// --- 3. 繪師後台 ---
const ArtistDashboard = ({ commissions, notify, onLogout }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const pendingRequests = commissions.filter(c => c.status === 'pending');
  const activeCommissions = commissions.filter(c => c.status !== 'pending');

  const openModal = (item = null) => {
    setEditingItem(item ? JSON.parse(JSON.stringify(item)) : {
      name: '', code: '', status: 'waiting', note: '', contact: '',
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

  const handleSave = async (data) => {
    if (data.status !== 'pending' && (!data.code || data.code === 'PENDING')) {
        notify('請為新委託設定一個正式編號', 'error');
        return;
    }

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
        await updateDoc(doc(db, "commissions", data.id), dataToSave);
        notify(data.status === 'pending' ? '申請已更新' : '委託資料已更新');
      } else {
        await addDoc(collection(db, "commissions"), dataToSave);
        notify('新委託已建立');
      }
      setIsModalOpen(false);
    } catch (e) {
      notify('儲存失敗: ' + e.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('確定要刪除嗎？無法復原。')) {
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

        {pendingRequests.length > 0 && (
          <div className="mb-10">
            <h3 className="text-lg font-bold text-slate-500 mb-4 flex items-center gap-2">
                <FileQuestion className="text-pink-500" /> 待審核申請 ({pendingRequests.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingRequests.map(item => (
                    <div key={item.id} className="bg-pink-50 border-2 border-pink-100 rounded-3xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-pink-500 text-white text-xs px-3 py-1 rounded-bl-xl font-bold">New Request</div>
                        <h3 className="font-bold text-lg text-slate-800 mb-1">{item.name}</h3>
                        <p className="text-sm text-slate-500 mb-3 flex items-center gap-1"><Mail size={12}/> {item.contact}</p>
                        <div className="bg-white/60 p-3 rounded-xl text-sm text-slate-600 mb-4 line-clamp-3">
                            {item.desc || '無詳細描述'}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => openModal(item)} className="flex-1 py-2 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600 transition-all">審核 / 接受</button>
                            <button onClick={() => handleDelete(item.id)} className="px-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={18} /></button>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}

        <h3 className="text-lg font-bold text-slate-500 mb-4">進行中委託</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeCommissions.map(item => (
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

// --- 組件: 編輯視窗 (間距加大版) ---
const EditModal = ({ data, onClose, onSave }) => {
  const [form, setForm] = useState(data);
  const [tab, setTab] = useState('info'); 

  const updateItem = (key, field, value) => {
    setForm({ ...form, items: { ...form.items, [key]: { ...form.items[key], [field]: value } } });
  };
  const toggleActive = (key) => updateItem(key, 'active', !form.items[key].active);
  const tabs = [{ id: 'info', label: '基本' }, { id: 'avatar', label: '大頭' }, { id: 'halfBody', label: '半身' }, { id: 'fullBody', label: '全身' }];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col my-8">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0"><h3 className="font-bold text-xl text-slate-800">編輯委託</h3><button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24} /></button></div>
        <div className="flex p-3 bg-white border-b border-slate-100 shrink-0">{tabs.map(t => (<button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-colors ${tab === t.id ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>{t.label}</button>))}</div>
        
        {/* 調整內容區間距 */}
        <div className="p-8 overflow-y-auto custom-scrollbar max-h-[70vh]">
          {tab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div><label className="label">名稱</label><input type="text" className="input-field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div><label className="label">編號 (審核時請修改)</label><input type="text" className="input-field font-mono text-blue-600" value={form.code} onChange={e => setForm({...form, code: e.target.value})} /></div>
              </div>
              <div><label className="label">聯絡方式</label><input type="text" className="input-field" value={form.contact || ''} onChange={e => setForm({...form, contact: e.target.value})} placeholder="Email / Discord" /></div>
              <div><label className="label">狀態</label><div className="flex bg-slate-100 p-1.5 rounded-xl">
                  {['pending', 'waiting', 'working', 'done'].map(s => (
                    <button key={s} onClick={() => setForm({...form, status: s})} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${form.status === s ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{s}</button>
                  ))}
                </div></div>
              <div><label className="label">需求描述 / 備註</label><textarea className="input-field resize-none h-32" value={form.desc || form.note} onChange={e => setForm({...form, note: e.target.value, desc: e.target.value})}></textarea></div>
            </div>
          )}
          {['avatar', 'halfBody', 'fullBody'].includes(tab) && (
            <div className="space-y-8">
              <div className="flex items-center justify-between bg-slate-50 p-5 rounded-xl border border-slate-100"><span className="font-bold text-slate-700">啟用此項目</span><button onClick={() => toggleActive(tab)} className={`w-12 h-7 rounded-full transition-colors relative ${form.items[tab].active ? 'bg-blue-500' : 'bg-slate-300'}`}><span className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${form.items[tab].active ? 'translate-x-5' : ''}`}></span></button></div>
              {form.items[tab].active && (
                <div className="space-y-6 animate-in slide-in-from-top-2">
                   <div><label className="label">進度 ({form.items[tab].progress}%)</label><input type="range" min="0" max="100" className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500" value={form.items[tab].progress} onChange={e => updateItem(tab, 'progress', parseInt(e.target.value))} /></div>
                   <div className="grid grid-cols-2 gap-6"><div><label className="label">金額</label><input type="number" className="input-field" value={form.items[tab].price} onChange={e => updateItem(tab, 'price', parseInt(e.target.value) || 0)} /></div><div><label className="label">付款</label><select className="input-field" value={form.items[tab].payment} onChange={e => updateItem(tab, 'payment', e.target.value)}><option value="none">未付款</option><option value="deposit">訂金</option><option value="full">付清</option></select></div></div>
                   <div><label className="label">預覽圖連結 (URL)</label><input type="text" className="input-field text-xs" placeholder="https://..." value={form.items[tab].preview || ''} onChange={e => updateItem(tab, 'preview', e.target.value)} /><p className="text-[10px] text-slate-400 mt-2">請貼上圖片網址</p></div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-6 border-t border-slate-100 flex gap-4 shrink-0 bg-white"><button onClick={onClose} className="flex-1 py-3.5 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors">取消</button><button onClick={() => onSave(form)} className="flex-[2] bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20">儲存變更</button></div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status, mini }) => {
  const config = { 
    pending: { bg: 'bg-pink-50', text: 'text-pink-600', label: '待審核', icon: FileQuestion },
    waiting: { bg: 'bg-slate-100', text: 'text-slate-500', label: '排單中', icon: Clock }, 
    working: { bg: 'bg-blue-50', text: 'text-blue-600', label: '繪製中', icon: Activity }, 
    done: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: '已完成', icon: CheckCircle2 } 
  };
  const { bg, text, label, icon: Icon } = config[status] || config['waiting'];
  if (mini) return <span className={`${bg} ${text} p-1.5 rounded-lg`}><Icon size={14} /></span>;
  return <span className={`${bg} ${text} rounded-full font-bold px-4 py-2 text-sm flex items-center gap-2 border border-white shadow-sm`}><Icon size={16} /> {label}</span>;
};

// --- CSS樣式調整：加大標籤間距 mb-3 (原本2) ---
const styles = `.label { @apply block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3; } .input-field { @apply w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700; } .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`;
export default App;