import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: 請將下方的設定替換成您在 Firebase 後台 (Project settings) 看到的內容
const firebaseConfig = {
 apiKey: "AIzaSyCeHj5Kc6E_ltyXboL7cWSpFClq4FrCrvU",
  authDomain: "commission-hub-cc739.firebaseapp.com",
  projectId: "commission-hub-cc739",
  storageBucket: "commission-hub-cc739.firebasestorage.app",
  messagingSenderId: "1022991297741",
  appId: "1:1022991297741:web:df716fcd268c0d9d2c8d84"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 初始化資料庫並匯出
export const db = getFirestore(app);