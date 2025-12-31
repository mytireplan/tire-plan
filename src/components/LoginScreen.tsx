
import React, { useState } from 'react';
import { Store as StoreIcon, Lock, AlertCircle, ChevronRight, UserCircle2, ShieldCheck } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

interface LoginScreenProps {
  onLogin: (userId: string, email: string) => Promise<void>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!userId.trim() || !password.trim()) {
        setError('아이디와 비밀번호를 입력해주세요.');
        return;
    }

    setLoading(true);
    try {
        // Firebase Auth는 이메일 기반이므로 userId를 이메일 형식으로 변환
        // 예: 250001 -> 250001@tireplan.kr
        const email = userId.includes('@') ? userId : `${userId}@tireplan.kr`;
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        
        // Firebase UID를 사용하여 로그인 처리
        await onLogin(firebaseUser.uid, email);
        
    } catch (err: any) {
        console.error('Login error:', err);
        
        // Firebase Auth 에러 메시지 한글화
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
            setError('아이디 또는 비밀번호가 잘못되었습니다.');
        } else if (err.code === 'auth/invalid-email') {
            setError('유효하지 않은 아이디 형식입니다.');
        } else if (err.code === 'auth/too-many-requests') {
            setError('로그인 시도 횟수가 너무 많습니다. 잠시 후 다시 시도해주세요.');
        } else {
            setError('로그인 처리 중 오류가 발생했습니다.');
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200/30 rounded-full blur-3xl"></div>

        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 z-10 animate-scale-in border border-white/50 backdrop-blur-sm">
            <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 rotate-3 transition-transform hover:rotate-6">
                    <StoreIcon size={40} />
                </div>
            </div>
            
            <h2 className="text-2xl font-bold text-center text-slate-800 mb-1">SmartPOS ERP</h2>
            <p className="text-center text-slate-500 mb-8 text-sm">통합 매장 관리 시스템</p>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1 flex items-center gap-1">
                        <ShieldCheck size={14}/> 점주/관리자 고유번호 (Serial ID)
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <UserCircle2 size={18} />
                        </div>
                        <input 
                            type="text" 
                            placeholder="예: 250001"
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-800"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">비밀번호 (Password)</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <Lock size={18} />
                        </div>
                        <input 
                            type="password" 
                            placeholder="비밀번호 입력"
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-800"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2 animate-fade-in">
                        <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                        <p className="text-xs text-red-600 font-bold">{error}</p>
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <>
                            로그인
                            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-8 text-center">
                <p className="text-xs text-slate-400">
                    시스템 문의: 본사 운영팀 (02-1234-5678)
                </p>
                <div className="mt-2 text-[10px] text-slate-400 bg-slate-50 inline-block px-2 py-1 rounded border border-slate-200">
                    Demo: <b>250001</b> (PW: 1234)
                </div>
            </div>
        </div>
    </div>
  );
};

export default LoginScreen;
