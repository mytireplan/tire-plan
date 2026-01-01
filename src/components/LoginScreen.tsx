
import React, { useState } from 'react';
import { Store as StoreIcon, Lock, AlertCircle, ChevronRight, UserCircle2, ShieldCheck, CheckCircle } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { validateOwnerPassword, isAccountLocked, registerOwner, requestPasswordReset, validateEmail, validatePasswordStrength } from '../utils/auth';

interface LoginScreenProps {
  onLogin: (userId: string, email: string) => Promise<void>;
}

type ViewMode = 'login' | 'register' | 'reset-password';

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  
  // 회원가입 필드
  const [registerData, setRegisterData] = useState({
    id: '',
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
    phoneNumber: '',
    businessName: ''
  });

  // 비밀번호 찾기 필드
  const [resetData, setResetData] = useState({
    id: '',
    email: ''
  });

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

    // 계정 잠금 확인
    if (isAccountLocked(userId)) {
        setError('너무 많은 로그인 실패로 계정이 잠겼습니다. 30분 후 다시 시도해주세요.');
        return;
    }

    setLoading(true);
    try {
        // Firestore에서 비밀번호 검증
        const result = await validateOwnerPassword(userId, password);
        
        if (!result.valid || !result.owner) {
            setError(result.error || '로그인에 실패했습니다.');
            setLoading(false);
            return;
        }

        // 로그인 성공
        await onLogin(result.owner.id, result.owner.email || `${userId}@tireplan.kr`);
        console.log('✅ 로그인 성공:', result.owner.id);
        
    } catch (err: any) {
        console.error('Login error:', err);
        setError('로그인 처리 중 오류가 발생했습니다.');
    } finally {
        setLoading(false);
    }
  };

  // 회원가입 핸들러
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 필수 입력 확인
    if (!registerData.id || !registerData.name || !registerData.email || !registerData.password || !registerData.phoneNumber) {
      setError('필수 항목을 모두 입력해주세요.');
      return;
    }

    // 이메일 형식 확인
    if (!validateEmail(registerData.email)) {
      setError('올바른 이메일 형식이 아닙니다.');
      return;
    }

    // 비밀번호 확인
    if (registerData.password !== registerData.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 비밀번호 강도 확인
    const pwCheck = validatePasswordStrength(registerData.password);
    if (!pwCheck.valid) {
      setError(pwCheck.message || '비밀번호 조건을 확인해주세요.');
      return;
    }

    setLoading(true);
    try {
      const result = await registerOwner({
        id: registerData.id,
        name: registerData.name,
        email: registerData.email,
        password: registerData.password,
        phoneNumber: registerData.phoneNumber,
        businessName: registerData.businessName
      });

      if (!result.success) {
        setError(result.error || '회원가입에 실패했습니다.');
        return;
      }

      setSuccess('회원가입이 완료되었습니다! 로그인해주세요.');
      setTimeout(() => {
        setViewMode('login');
        setShowEmailLogin(true);
        setUserId(registerData.id);
      }, 2000);

    } catch (err: any) {
      console.error('Registration error:', err);
      setError('회원가입 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 비밀번호 찾기 핸들러
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!resetData.id || !resetData.email) {
      setError('아이디와 이메일을 입력해주세요.');
      return;
    }

    if (!validateEmail(resetData.email)) {
      setError('올바른 이메일 형식이 아닙니다.');
      return;
    }

    setLoading(true);
    try {
      const result = await requestPasswordReset(resetData.id, resetData.email);

      if (!result.success) {
        setError(result.error || '비밀번호 재설정에 실패했습니다.');
        return;
      }

      setSuccess(`임시 비밀번호가 발송되었습니다: ${result.tempPassword} (개발용 표시)`);
      setTimeout(() => {
        setViewMode('login');
        setShowEmailLogin(true);
        setUserId(resetData.id);
      }, 5000);

    } catch (err: any) {
      console.error('Password reset error:', err);
      setError('비밀번호 재설정 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200/30 rounded-full blur-3xl"></div>

        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 z-10 border border-white/50 backdrop-blur-sm">
            <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 rotate-3 transition-transform hover:rotate-6">
                    <StoreIcon size={40} />
                </div>
            </div>
            
            <h2 className="text-2xl font-bold text-center text-slate-800 mb-1">SmartPOS ERP</h2>
            <p className="text-center text-slate-500 mb-8 text-sm">
                {viewMode === 'register' ? '신규 점주 등록' : viewMode === 'reset-password' ? '비밀번호 찾기' : '통합 매장 관리 시스템'}
            </p>

            {viewMode === 'register' ? (
                /* 회원가입 화면 */
                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">점주 고유번호 (ID)</label>
                        <input 
                            type="text" 
                            placeholder="예: 250003"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={registerData.id}
                            onChange={(e) => setRegisterData({...registerData, id: e.target.value})}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">이름</label>
                        <input 
                            type="text" 
                            placeholder="홍길동"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={registerData.name}
                            onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">이메일</label>
                        <input 
                            type="email" 
                            placeholder="example@tireplan.kr"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={registerData.email}
                            onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">연락처</label>
                        <input 
                            type="tel" 
                            placeholder="010-1234-5678"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={registerData.phoneNumber}
                            onChange={(e) => setRegisterData({...registerData, phoneNumber: e.target.value})}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">비밀번호 (최소 4자, 숫자 포함)</label>
                        <input 
                            type="password" 
                            placeholder="비밀번호"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={registerData.password}
                            onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">비밀번호 확인</label>
                        <input 
                            type="password" 
                            placeholder="비밀번호 확인"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={registerData.passwordConfirm}
                            onChange={(e) => setRegisterData({...registerData, passwordConfirm: e.target.value})}
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2">
                            <AlertCircle size={16} className="text-red-500" />
                            <p className="text-xs text-red-600 font-bold">{error}</p>
                        </div>
                    )}
                    {success && (
                        <div className="p-3 rounded-lg bg-green-50 border border-green-100 flex items-center gap-2">
                            <CheckCircle size={16} className="text-green-500" />
                            <p className="text-xs text-green-600 font-bold">{success}</p>
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-70"
                    >
                        {loading ? '처리 중...' : '회원가입'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setViewMode('login')}
                        className="w-full py-2 text-sm text-slate-500 hover:text-slate-700"
                    >
                        ← 로그인으로 돌아가기
                    </button>
                </form>
            ) : viewMode === 'reset-password' ? (
                /* 비밀번호 찾기 화면 */
                <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">점주 고유번호 (ID)</label>
                        <input 
                            type="text" 
                            placeholder="예: 250001"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={resetData.id}
                            onChange={(e) => setResetData({...resetData, id: e.target.value})}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">등록된 이메일</label>
                        <input 
                            type="email" 
                            placeholder="example@tireplan.kr"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={resetData.email}
                            onChange={(e) => setResetData({...resetData, email: e.target.value})}
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2">
                            <AlertCircle size={16} className="text-red-500" />
                            <p className="text-xs text-red-600 font-bold">{error}</p>
                        </div>
                    )}
                    {success && (
                        <div className="p-3 rounded-lg bg-green-50 border border-green-100 flex items-center gap-2">
                            <CheckCircle size={16} className="text-green-500" />
                            <p className="text-xs text-green-600 font-bold">{success}</p>
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-70"
                    >
                        {loading ? '처리 중...' : '임시 비밀번호 발송'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setViewMode('login')}
                        className="w-full py-2 text-sm text-slate-500 hover:text-slate-700"
                    >
                        ← 로그인으로 돌아가기
                    </button>
                </form>
            ) : (
                /* 로그인 화면 */
                <>
            {!showEmailLogin ? (
              <>
                {/* Google 로그인 */}
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google 계정으로 로그인
                </button>

                {error && (
                    <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2 animate-fade-in">
                        <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                        <p className="text-xs text-red-600 font-bold">{error}</p>
                    </div>
                )}

                {/* 구분선 */}
                <div className="mt-6 relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-slate-500">또는</span>
                    </div>
                </div>

                {/* 이메일 로그인으로 전환 */}
                <button
                    type="button"
                    onClick={() => {
                      setShowEmailLogin(true);
                      setError('');
                    }}
                    className="w-full mt-6 py-3 bg-slate-100 rounded-xl font-bold text-slate-700 hover:bg-slate-200 transition-all"
                >
                    ✉️ 이메일로 로그인
                </button>

                <div className="mt-8 text-center">
                    <p className="text-xs text-slate-400">
                        시스템 문의: 본사 운영팀 (02-1234-5678)
                    </p>
                    <div className="mt-2 text-[10px] text-slate-400 bg-slate-50 inline-block px-2 py-1 rounded border border-slate-200">
                        Demo: <b>250001</b> (PW: 1234)
                    </div>
                </div>
              </>
            ) : (
              <>
                {/* 이메일 로그인 폼 */}
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

                    <button
                        type="button"
                        onClick={() => {
                          setShowEmailLogin(false);
                          setError('');
                          setUserId('');
                          setPassword('');
                        }}
                        className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        ← 다른 방법으로 로그인
                    </button>

                    {/* 회원가입 / 비밀번호 찾기 링크 */}
                    <div className="mt-4 flex items-center justify-center gap-4 text-sm">
                        <button
                            type="button"
                            onClick={() => {
                                setViewMode('register');
                                setError('');
                                setSuccess('');
                            }}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            회원가입
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                            type="button"
                            onClick={() => {
                                setViewMode('reset-password');
                                setError('');
                                setSuccess('');
                            }}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            비밀번호 찾기
                        </button>
                    </div>
                </form>
              </>
            )}
            </>
            )}
        </div>
    </div>
  );
};

export default LoginScreen;
