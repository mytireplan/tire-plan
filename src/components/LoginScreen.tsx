
import React, { useState } from 'react';
import { Store as StoreIcon, Lock, AlertCircle, ChevronRight, UserCircle2, ShieldCheck } from 'lucide-react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';

interface LoginScreenProps {
  onLogin: (userId: string, email: string) => Promise<void>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Google 로그인 핸들러
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      await onLogin(user.uid, user.email || '');
      
    } catch (err: any) {
      console.error('Google login error:', err);
      
      if (err.code === 'auth/popup-closed-by-user') {
        setError('로그인 창이 닫혔습니다.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('팝업이 차단되었습니다. 브라우저 설정을 확인해주세요.');
      } else {
        setError('Google 로그인에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

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

            {/* 구분선 */}
            <div className="mt-6 relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-slate-500">또는</span>
                </div>
            </div>

            {/* Google 로그인 버튼 */}
            <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full mt-6 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google 계정으로 로그인
            </button>

            <div className="mt-8 text-center">
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
