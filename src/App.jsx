import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from './stores/authStore'
import { useProductStore } from './stores/productStore'
import { usersApi } from './api/users'
import { authApi } from './api/auth'
import { errorMessage } from './api/http'
import './styles.css'

const demoProducts = [
  { id: 'd1', name: 'Café especial', price: 32.9, quantity: 24, created_at: '2026-03-21' },
  { id: 'd2', name: 'Cerâmica artesanal', price: 86, quantity: 8, created_at: '2026-03-20' },
  { id: 'd3', name: 'Caderno de capa dura', price: 42.5, quantity: 0, created_at: '2026-03-19' },
  { id: 'd4', name: 'Kit de boas-vindas', price: 119, quantity: 12, created_at: '2026-03-18' },
  { id: 'd5', name: 'Vela de figo', price: 58, quantity: 5, created_at: '2026-03-16' },
]
const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const initials = (name = 'M') => name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
const sections = ['overview', 'products', 'users', 'profile']

function Avatar({ user, fallbackName, className }) {
  const imageUrl = user?.avatar_url || (typeof user?.avatar === 'string' ? user.avatar : '')
  const [failedImageUrl, setFailedImageUrl] = useState('')

  return <div className={className}>
    {imageUrl && failedImageUrl !== imageUrl
      ? <img src={imageUrl} alt="" onError={() => setFailedImageUrl(imageUrl)}/>
      : initials(fallbackName || user?.name)}
  </div>
}

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    down: <><path d="m7 10 5 5 5-5"/></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10"/></>,
    filter: <><path d="M4 7h16M7 12h10m-7 5h4"/></>,
    dots: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    close: <><path d="m18 6-12 12M6 6l12 12"/></>,
    leaf: <><path d="M20 4c-7 0-13 3-13 10a6 6 0 0 0 6 6c7 0 10-6 7-16Z"/><path d="M4 21c2-5 6-8 12-11"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></>,
    chev: <><path d="m9 18 6-6-6-6"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function App() {
  const auth = useAuthStore()
  const products = useProductStore()
  const [section, setSection] = useState(() => {
    const previousSection = sessionStorage.getItem('mercado_section')
    const hasToken = Boolean(localStorage.getItem('mercado_token'))
    if (previousSection === 'users' && !hasToken) return 'products'
    if (sections.includes(previousSection)) return previousSection
    return hasToken ? 'overview' : 'products'
  })
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState('')
  const [apiAvailable, setApiAvailable] = useState(true)
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(() =>
    sessionStorage.getItem('mercado_section') === 'users' &&
    Boolean(localStorage.getItem('mercado_token'))
  )
  const [authMode, setAuthMode] = useState(() => new URLSearchParams(window.location.search).has('token') ? 'reset' : 'login')
  const [authMessage, setAuthMessage] = useState('')
  const [authFormError, setAuthFormError] = useState('')
  const [emailValidationError, setEmailValidationError] = useState('')
  const [passwordValidationError, setPasswordValidationError] = useState('')
  const [emailLookup, setEmailLookup] = useState(null)
  const [unknownEmailLoginAttempted, setUnknownEmailLoginAttempted] = useState(false)
  const [showAuthLoading, setShowAuthLoading] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [profilePassword, setProfilePassword] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [avatarMessage, setAvatarMessage] = useState('')
  const [productForm, setProductForm] = useState({ name: '', price: '', quantity: '' })
  useEffect(() => {
    if (!auth.loading) return undefined
    const timer = setTimeout(() => setShowAuthLoading(true), 180)
    return () => clearTimeout(timer)
  }, [auth.loading])
  useEffect(() => {
    if (sections.includes(section)) sessionStorage.setItem('mercado_section', section)
  }, [section])
  useEffect(() => { useAuthStore.getState().hydrate() }, [])
  useEffect(() => {
    const handle = () => {
      useAuthStore.getState().logout()
      setUsers([])
      setUsersLoading(false)
      setSection('products')
    }
    window.addEventListener('mercado:unauthorized', handle)
    return () => window.removeEventListener('mercado:unauthorized', handle)
  }, [])
  useEffect(() => {
    let active = true
    useProductStore.getState().fetch().then(() => { if (active) setApiAvailable(!useProductStore.getState().error) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    const timer = setTimeout(() => useProductStore.getState().fetch({ filter: query.trim(), currentPage: 1 }), 280)
    return () => clearTimeout(timer)
  }, [query])
  const isDemo = !apiAvailable
  const rows = isDemo ? demoProducts.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())) : (Array.isArray(products.items) ? products.items : [])
  const lowStock = rows.filter((item) => item.quantity > 0 && item.quantity < 10).length
  const outOfStock = rows.filter((item) => item.quantity === 0).length
  const inventoryValue = rows.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const pagination = useMemo(() => ({ page: products.currentPage, last: products.lastPage }), [products.currentPage, products.lastPage])
  const canOfferRegistration = authMode === 'login' && emailLookup?.email === loginEmail.trim().toLowerCase() && emailLookup.exists === false
  const isInvalidLogin = authMode === 'login' && /invalid credentials|credenciais?\s+inv[aá]lid|confira (?:seu )?e-?mail.*senha|(?:e-?mail|account|conta|user|usu[aá]rio).*(?:not found|does not exist|n[aã]o encontrad[oa]|n[aã]o existe|n[aã]o cadastrad[oa])/i.test(auth.error)
  const emailLookupMatches = emailLookup?.email === loginEmail.trim().toLowerCase()
  const displayedEmailError = emailValidationError || (isInvalidLogin && (
    emailLookupMatches && emailLookup.exists === false
      ? ''
      : !emailLookupMatches || emailLookup.exists === null
        ? 'Confira seu e-mail.'
        : ''
  ))
  const displayedPasswordError = passwordValidationError || (unknownEmailLoginAttempted && emailLookupMatches && emailLookup.exists === false
    ? 'Esta conta não existe.'
    : isInvalidLogin && (
      emailLookupMatches && emailLookup.exists === false
        ? ''
        : emailLookupMatches && emailLookup.exists === true
          ? 'As credenciais não conferem. Confira sua senha e tente novamente.'
          : 'Confira sua senha.'
    ))
  const displayedAuthError = authFormError || (auth.error && !isInvalidLogin ? auth.error : '')

  useEffect(() => {
    const email = loginEmail.trim()
    if (!email || isValidEmail(email) || authMode === 'reset') return undefined

    const timer = setTimeout(() => {
      setEmailValidationError('Digite um endereço de e-mail válido, como voce@exemplo.com.')
    }, 750)

    return () => clearTimeout(timer)
  }, [authMode, loginEmail])

  useEffect(() => {
    const email = loginEmail.trim().toLowerCase()
    if (authMode !== 'login' || !isValidEmail(email)) return undefined

    let active = true
    const timer = setTimeout(() => {
      authApi.checkEmailStatus(email)
        .then((result) => {
          if (active) setEmailLookup({ email, exists: result.exists })
        })
        .catch(() => {
          if (active) setEmailLookup({ email, exists: null })
        })
    }, 650)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [authMode, loginEmail])

  const openNewProduct = () => { setProductForm({ name: '', price: '', quantity: '' }); setDialog({ type: 'product' }) }
  const editProduct = (product) => { setProductForm({ name: product.name, price: String(product.price), quantity: String(product.quantity) }); setDialog({ type: 'product', product }) }
  const submitProduct = async (event) => {
    event.preventDefault()
    const body = { name: productForm.name.trim(), price: Number(productForm.price), quantity: Number(productForm.quantity) }
    if (!body.name || body.price <= 0 || body.quantity < 0 || !Number.isInteger(body.quantity)) return
    try {
      await products.save(dialog.product?.id, body)
      setDialog(null); setNotice(dialog.product ? 'Produto atualizado.' : 'Produto adicionado ao catálogo.')
      if (!isDemo) products.fetch()
    } catch (error) { setNotice(errorMessage(error)) }
    setTimeout(() => setNotice(''), 2800)
  }
  const deleteProduct = async (product) => {
    if (isDemo) { setNotice('Configure a API para editar o catálogo.'); return }
    try { await products.remove(product.id); setNotice('Produto removido.') }
    catch (error) { setNotice(errorMessage(error)) }
    setDialog(null); setTimeout(() => setNotice(''), 2800)
  }
  useEffect(() => {
    if (section !== 'users' || !auth.token) return

    let active = true
    usersApi.list({ page: 1, per_page: 10, sort: 'created_at', sort_dir: 'desc' })
      .then((data) => {
        if (active) setUsers(Array.isArray(data.items) ? data.items : [])
      })
      .catch((error) => {
        if (active) {
          setUsers([])
          setNotice(errorMessage(error))
        }
      })
      .finally(() => {
        if (active) setUsersLoading(false)
      })

    return () => { active = false }
  }, [section, auth.token])

  const changeSection = (next) => {
    if (next === section) return
    if (next === 'users') {
      if (!auth.token) {
        setSection('login')
        return
      }
      setUsersLoading(true)
    } else {
      setUsersLoading(false)
    }
    setSection(next)
  }
  const submitLogin = async (event) => {
    event.preventDefault()
    setShowAuthLoading(false)
    setAuthFormError('')
    setEmailValidationError('')
    setPasswordValidationError('')
    auth.clearError()
    setAuthMessage('')

    const form = event.currentTarget
    const email = form.elements.email?.value.trim() || ''
    const password = form.elements.password?.value || ''
    if (authMode === 'register' && !form.elements.name.value.trim()) {
      setAuthFormError('Informe seu nome para criar a conta.')
      return
    }
    if (authMode !== 'reset' && email && !isValidEmail(email)) {
      setEmailValidationError('Digite um endereço de e-mail válido, como voce@exemplo.com.')
      return
    }
    if (authMode !== 'reset' && !email) {
      setEmailValidationError('Informe seu e-mail para continuar.')
      if (authMode !== 'forgot' && !password) setPasswordValidationError('Informe sua senha para continuar.')
      return
    }
    if (authMode === 'login') {
      let accountExists = emailLookupMatches ? emailLookup.exists : null
      if (accountExists === null) {
        try {
          const result = await authApi.checkEmailStatus(email.toLowerCase())
          accountExists = result.exists
          setEmailLookup({ email: email.toLowerCase(), exists: accountExists })
        } catch {
          accountExists = null
        }
      }
      if (accountExists === false) {
        setUnknownEmailLoginAttempted(true)
        setPasswordValidationError('Esta conta não existe.')
        return
      }
    }
    if (authMode !== 'forgot' && !password) {
      setPasswordValidationError(authMode === 'reset'
        ? 'Informe sua nova senha para continuar.'
        : 'Informe sua senha para continuar.')
      return
    }

    try {
      if (authMode === 'register') {
        const name = event.currentTarget.elements.name.value.trim()
        await authApi.register({ name, email: loginEmail, password: loginPassword })
        setAuthMode('login')
        setLoginPassword('')
        setAuthMessage('Conta criada. Agora você pode entrar.')
        return
      }

      if (authMode === 'forgot') {
        await authApi.forgotPassword({ email: loginEmail })
        setAuthMode('login')
        setAuthMessage('Se o endereço estiver cadastrado, você receberá instruções para redefinir a senha.')
        return
      }

      if (authMode === 'reset') {
        const token = new URLSearchParams(window.location.search).get('token')
        if (!token) throw new Error('O link de redefinição está incompleto. Solicite um novo email.')
        await authApi.resetPassword({ token, password: loginPassword })
        window.history.replaceState({}, '', window.location.pathname)
        setAuthMode('login')
        setLoginPassword('')
        setAuthMessage('Senha redefinida. Entre com sua nova senha.')
        return
      }

      const loggedIn = await auth.login({ email: loginEmail, password: loginPassword })
      if (loggedIn) setSection('overview')
    } catch (error) {
      useAuthStore.setState({ error: errorMessage(error) })
    }
  }
  const saveProfile = async (event) => {
    event.preventDefault(); setProfileMessage('')
    try {
      const body = {
        name: event.currentTarget.elements.name.value.trim(),
        email: event.currentTarget.elements.email.value.trim(),
      }
      if (profilePassword) { body.old_password = oldPassword; body.password = profilePassword }
      const user = await usersApi.updateProfile(body); useAuthStore.setState({ user }); setOldPassword(''); setProfilePassword(''); setProfileMessage('Perfil atualizado.')
    } catch (error) { setProfileMessage(errorMessage(error)) }
  }
  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !auth.user) return
    setAvatarMessage('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarMessage('Escolha uma imagem JPEG, PNG ou WebP.')
      event.target.value = ''
      return
    }
    const form = new FormData(); form.append('user_id', auth.user.id); form.append('file', file)
    try {
      useAuthStore.setState({ user: await usersApi.updateAvatar(form) })
      setAvatarMessage('Foto atualizada.')
    } catch (error) {
      setAvatarMessage(error.response?.status === 500
        ? 'Não foi possível enviar sua foto agora. Tente novamente mais tarde ou fale com o suporte.'
        : errorMessage(error))
    }
    finally { event.target.value = '' }
  }

  if (!auth.token && section !== 'login') return <main className="login-page">
    <div className="login-visual"><a className="brand brand-light" href="/"><span className="brand-mark"><Icon name="leaf" size={20}/></span> mercado<span className="brand-period">.</span></a><div className="login-copy"><span className="eyebrow">UM LUGAR PARA O SEU NEGÓCIO</span><h1>O essencial,<br/>bem cuidado.</h1><p>Um jeito mais bonito e simples de acompanhar o que você constrói.</p></div><div className="login-note"><span className="note-dot"/> Seu negócio, em boas mãos</div></div>
    <div className="login-panel"><div className="login-form-wrap">
      <div className="mobile-brand"><span className="brand-mark"><Icon name="leaf" size={20}/></span> mercado<span className="brand-period">.</span></div>
      <div className="form-heading">
        <span className="eyebrow">{authMode === 'register' ? 'COMECE POR AQUI' : authMode === 'forgot' ? 'RECUPERE O ACESSO' : authMode === 'reset' ? 'ESCOLHA UMA NOVA SENHA' : 'BOM TER VOCÊ DE VOLTA'}</span>
        <h2>{authMode === 'register' ? 'Crie sua conta' : authMode === 'forgot' ? 'Esqueceu a senha?' : authMode === 'reset' ? 'Redefina sua senha' : 'Entre na sua conta'}</h2>
        <p>{authMode === 'register' ? 'Leva menos de um minuto.' : authMode === 'forgot' ? 'Enviaremos instruções para o seu e-mail.' : authMode === 'reset' ? 'Escolha uma senha nova para sua conta.' : 'Seus produtos estão esperando.'}</p>
      </div>
      <form className="auth-form" onSubmit={submitLogin} noValidate>
        {authMode === 'register' && <label>Seu nome<input name="name" required placeholder="Como podemos te chamar?" autoComplete="name" onChange={() => setAuthFormError('')}/></label>}
        {authMode !== 'reset' && <label>E-mail<input name="email" required type="email" value={loginEmail} aria-invalid={Boolean(displayedEmailError)} aria-describedby={displayedEmailError ? 'email-validation-error' : undefined} onChange={(e) => { const value = e.target.value; setLoginEmail(value); setEmailLookup(null); setUnknownEmailLoginAttempted(false); setEmailValidationError(''); setPasswordValidationError(''); setAuthFormError(''); auth.clearError() }} placeholder="voce@exemplo.com" autoComplete="email"/>{displayedEmailError && <span className="field-error" id="email-validation-error" role="alert">{displayedEmailError}</span>}</label>}
        {canOfferRegistration && <div className="auth-feedback"><div className="auth-feedback-content"><div className="registration-prompt"><span role={unknownEmailLoginAttempted ? 'alert' : 'status'}>E-mail não encontrado. Você pode criar uma conta agora.</span><button type="button" onClick={() => { setAuthMode('register'); setUnknownEmailLoginAttempted(false); auth.clearError(); setAuthFormError(''); setEmailValidationError(''); setPasswordValidationError(''); setAuthMessage('') }}>Criar conta</button></div></div></div>}
        {authMode !== 'forgot' && <label>{authMode === 'reset' ? 'Nova senha' : 'Senha'}<input name="password" required type="password" value={loginPassword} aria-invalid={Boolean(displayedPasswordError)} aria-describedby={displayedPasswordError ? 'password-validation-error' : undefined} onChange={(e) => { setLoginPassword(e.target.value); setPasswordValidationError(''); setAuthFormError(''); auth.clearError() }} placeholder="••••••••" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}/>{displayedPasswordError && <div className="auth-feedback" id="password-validation-error"><div className="auth-feedback-content"><span className="login-error-message" role="alert">{displayedPasswordError}</span></div></div>}</label>}
        {displayedAuthError && <div className="error-box" role="alert">{displayedAuthError}</div>}
        {authMessage && <div className="inline-message">{authMessage}</div>}
        <button className="button button-primary full" disabled={auth.loading} aria-busy={auth.loading}>{auth.loading && showAuthLoading && <><span className="auth-spinner" aria-hidden="true"/>{authMode === 'register' ? 'Criando conta…' : authMode === 'forgot' ? 'Enviando…' : 'Entrando…'}</>}{!auth.loading && <>{authMode === 'register' ? 'Criar conta' : authMode === 'forgot' ? 'Enviar instruções' : authMode === 'reset' ? 'Salvar nova senha' : 'Entrar'} <Icon name="arrow" size={16}/></>}</button>
      </form>
      {authMode === 'login' && <button className="auth-link" onClick={() => { setAuthMode('forgot'); setEmailLookup(null); setEmailValidationError(''); setPasswordValidationError(''); setAuthFormError(''); auth.clearError(); setAuthMessage('') }}>Esqueci minha senha</button>}
      {authMode === 'login' && !canOfferRegistration && <div className="auth-switch">Primeira vez por aqui? <button onClick={() => { setAuthMode('register'); auth.clearError(); setAuthFormError(''); setEmailValidationError(''); setPasswordValidationError(''); setAuthMessage('') }}>Criar conta</button></div>}
      {authMode === 'register' && <div className="auth-switch">Já tem uma conta? <button onClick={() => { setAuthMode('login'); setEmailLookup(null); setEmailValidationError(''); setPasswordValidationError(''); setAuthFormError(''); auth.clearError(); setAuthMessage('') }}>Fazer login</button></div>}
      {(authMode === 'forgot' || authMode === 'reset') && <button className="auth-link" onClick={() => { setAuthMode('login'); setEmailValidationError(''); setPasswordValidationError(''); setAuthFormError(''); auth.clearError(); setAuthMessage(''); window.history.replaceState({}, '', window.location.pathname) }}>Voltar ao login</button>}
      <button className="auth-link auth-back" onClick={() => setSection('products')}>Voltar ao catálogo</button><p className="login-foot">Feito para cuidar do seu negócio com leveza.</p>
    </div></div>
  </main>

  return <div className="app-shell">
    <aside className="sidebar"><a className="brand" href="/"><span className="brand-mark"><Icon name="leaf" size={20}/></span> mercado<span className="brand-period">.</span></a><span className="nav-label">ESPAÇO DE TRABALHO</span><nav className="nav-list"><button className={`nav-item ${section === 'overview' ? 'active' : ''}`} onClick={() => changeSection('overview')}><Icon name="grid"/>Visão geral</button><button className={`nav-item ${section === 'products' ? 'active' : ''}`} onClick={() => changeSection('products')}><Icon name="box"/>Produtos<span className="nav-count">{products.total || rows.length}</span></button>{auth.token && <button className={`nav-item ${section === 'users' ? 'active' : ''}`} onClick={() => changeSection('users')}><Icon name="users"/>Pessoas</button>}</nav><div className="sidebar-bottom"><div className="help-card"><span className="help-spark">✳</span><strong>Um passo de cada vez.</strong><p>Organize sua vitrine e deixe o resto fluir.</p><button onClick={() => setNotice('Adicione produtos pelo botão “Novo produto”.')}>Como começar <Icon name="arrow" size={14}/></button></div><div className="profile-chip" onClick={() => auth.token && changeSection('profile')} role={auth.token ? 'button' : undefined}><Avatar className="avatar" user={auth.user} fallbackName={auth.user?.name || 'Meu negócio'}/><div className="profile-meta"><strong>{auth.user?.name || 'Meu negócio'}</strong><span>{auth.user?.email || 'Espaço de trabalho'}</span></div>{auth.token ? <button title="Sair" className="icon-button logout-button" onClick={(e) => { e.stopPropagation(); auth.logout(); setUsers([]); setUsersLoading(false); setSection('products') }}><Icon name="logout" size={16}/></button> : <button className="text-link" onClick={() => setSection('login')}>Entrar</button>}</div></div></aside>
    <main className="main-area"><header className="topbar"><div className="breadcrumb">Seu espaço <Icon name="chev" size={14}/><span>{section === 'products' ? 'Produtos' : section === 'users' ? 'Pessoas' : section === 'profile' ? 'Meu perfil' : 'Visão geral'}</span></div><div className="topbar-right"><span className={`connection ${isDemo ? 'offline' : ''}`}><span/>{isDemo ? 'Modo de demonstração' : 'Tudo sincronizado'}</span><Avatar className="top-avatar" user={auth.user} fallbackName={auth.user?.name || 'M'}/></div></header>
      <div className="content-wrap">
        {section === 'products' && <>
          <div className="page-heading"><div><span className="eyebrow">A CASA DO SEU CATÁLOGO</span><h1>Seus produtos<span className="heading-dot">.</span></h1><p>Um olhar claro sobre tudo o que você oferece.</p></div><button className="button button-primary" onClick={openNewProduct}><Icon name="plus" size={17}/> Novo produto</button></div>
          {isDemo && <div className="demo-banner"><span className="demo-icon">✳</span><span><strong>Uma prévia do Mercado.</strong> Conecte a API para trabalhar com seus produtos.</span><a href="#config" onClick={(e) => { e.preventDefault(); setNotice('Defina VITE_API_URL no arquivo .env para conectar a API.') }}>Como conectar <Icon name="arrow" size={13}/></a></div>}
          <section className="stats-grid"><article className="stat-card"><div className="stat-top"><span>Produtos no catálogo</span><span className="stat-icon lavender"><Icon name="box" size={17}/></span></div><strong>{isDemo ? rows.length : products.total}</strong><small>itens disponíveis para você</small></article><article className="stat-card"><div className="stat-top"><span>Valor em estoque</span><span className="stat-icon mint"><Icon name="arrow" size={17}/></span></div><strong>{money(inventoryValue)}</strong><small>considerando o estoque atual</small></article><article className="stat-card"><div className="stat-top"><span>Estoque baixo</span><span className="stat-icon peach"><span className="tiny-spark">✳</span></span></div><strong>{lowStock.toString().padStart(2, '0')}</strong><small>menos de 10 unidades</small></article><article className="stat-card"><div className="stat-top"><span>Sem estoque</span><span className="stat-icon gray"><span className="empty-ring"/></span></div><strong>{outOfStock.toString().padStart(2, '0')}</strong><small>vale dar uma olhada</small></article></section>
          <section className="catalog-card"><div className="catalog-head"><div><h2>Todos os produtos</h2><p>Uma seleção do que faz o seu negócio.</p></div><div className="catalog-actions"><label className="search-field"><Icon name="search" size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar produto"/><kbd>⌘ K</kbd></label><button className="button button-quiet" onClick={() => products.fetch({ sort: products.sort === 'name' ? 'created_at' : 'name', sortDir: products.sortDir === 'asc' ? 'desc' : 'asc' })}><Icon name="filter" size={16}/> Organizar <Icon name="down" size={14}/></button></div></div>
            <div className="table-scroll"><table><thead><tr><th>PRODUTO</th><th>PREÇO</th><th>QUANTIDADE</th><th>SITUAÇÃO</th><th aria-label="Ações"/></tr></thead><tbody>{products.loading && !isDemo ? <tr><td colSpan="5" className="table-message">Carregando seu catálogo…</td></tr> : rows.length === 0 ? <tr><td colSpan="5" className="table-message">{products.error || 'Nenhum produto por aqui ainda. Que tal adicionar o primeiro?'}</td></tr> : rows.map((item, index) => <tr key={item.id}><td><div className="product-cell"><div className={`product-thumb thumb-${index % 5}`}><span>{item.name.slice(0, 1).toUpperCase()}</span></div><div><strong>{item.name}</strong><small>{isDemo ? 'Demonstração' : `SKU · ${String(item.id).slice(0, 8)}`}</small></div></div></td><td className="price-cell">{money(item.price)}</td><td><span className="quantity-number">{String(item.quantity).padStart(2, '0')}</span><span className="quantity-unit">un.</span></td><td><span className={`status-pill ${item.quantity === 0 ? 'status-empty' : item.quantity < 10 ? 'status-low' : 'status-ok'}`}><span/>{item.quantity === 0 ? 'Esgotado' : item.quantity < 10 ? 'Estoque baixo' : 'Disponível'}</span></td><td><button className="icon-button row-menu" aria-label={`Editar ${item.name}`} onClick={() => editProduct(item)}><Icon name="dots"/></button></td></tr>)}</tbody></table></div>
            <div className="table-footer"><span>Mostrando <strong>{rows.length ? (isDemo ? rows.length : (products.currentPage - 1) * products.perPage + 1) : 0}–{isDemo ? rows.length : Math.min(products.currentPage * products.perPage, products.total)}</strong> de <strong>{isDemo ? rows.length : products.total}</strong> produtos</span><div className="pagination"><button disabled={products.currentPage <= 1} onClick={() => products.fetch({ currentPage: products.currentPage - 1 })}>←</button><span>{isDemo ? '1' : pagination.page} <i>/</i> {isDemo ? '1' : (pagination.last || 1)}</span><button disabled={isDemo || products.currentPage >= products.lastPage} onClick={() => products.fetch({ currentPage: products.currentPage + 1 })}>→</button></div></div>
          </section><div className="page-foot"><span>Um bom negócio começa com cuidado.</span><span>Mercado <b>·</b> feito para o dia a dia</span></div>
        </>}
        {section === 'overview' && <><div className="page-heading"><div><span className="eyebrow">BOM DIA, {auth.user?.name?.split(' ')[0]?.toUpperCase() || 'TUDO BEM'}</span><h1>Seu negócio, <span className="serif">no ritmo certo.</span></h1><p>Uma visão simples do que está acontecendo.</p></div><button className="button button-primary" onClick={() => { setSection('products'); openNewProduct() }}><Icon name="plus" size={17}/> Novo produto</button></div><section className="stats-grid overview-stats"><article className="stat-card"><div className="stat-top"><span>Produtos no catálogo</span><span className="stat-icon lavender"><Icon name="box" size={17}/></span></div><strong>{isDemo ? rows.length : products.total}</strong><small>itens cadastrados</small></article><article className="stat-card"><div className="stat-top"><span>Valor em estoque</span><span className="stat-icon mint"><Icon name="arrow" size={17}/></span></div><strong>{money(inventoryValue)}</strong><small>com base nas quantidades</small></article><article className="stat-card"><div className="stat-top"><span>Estoque baixo</span><span className="stat-icon peach"><span className="tiny-spark">✳</span></span></div><strong>{lowStock}</strong><small>pedem reposição em breve</small></article></section><div className="overview-lower"><section className="catalog-card overview-table"><div className="catalog-head"><div><h2>Movimento recente</h2><p>Os produtos do seu catálogo.</p></div><button className="text-link" onClick={() => setSection('products')}>Ver catálogo <Icon name="arrow" size={14}/></button></div><div className="table-scroll"><table><thead><tr><th>PRODUTO</th><th>PREÇO</th><th>QUANTIDADE</th></tr></thead><tbody>{rows.slice(0, 4).map((item, index) => <tr key={item.id}><td><div className="product-cell"><div className={`product-thumb thumb-${index % 5}`}><span>{item.name[0]}</span></div><div><strong>{item.name}</strong><small>Atualizado recentemente</small></div></div></td><td className="price-cell">{money(item.price)}</td><td>{item.quantity} un.</td></tr>)}</tbody></table></div></section><aside className="note-card"><span className="note-orbit">✳</span><span className="eyebrow">LEMBRETE AMIGO</span><h3>Pequenos cuidados fazem diferença.</h3><p>Olhe o estoque baixo de tempos em tempos. Seu próximo sucesso pode estar precisando de reposição.</p><button onClick={() => setSection('products')}>Conferir produtos <Icon name="arrow" size={15}/></button></aside></div></>}
        {section === 'profile' && <><div className="page-heading"><div><span className="eyebrow">SEU ESPAÇO, DO SEU JEITO</span><h1>Meu perfil<span className="heading-dot">.</span></h1><p>Cuide dos seus dados de acesso e da sua conta.</p></div></div><section className="profile-card"><div className="profile-card-top"><Avatar className="avatar avatar-large" user={auth.user} fallbackName={auth.user?.name}/><div><h2>{auth.user?.name}</h2><p>{auth.user?.email}</p></div><div className="avatar-control"><label className="button button-quiet avatar-upload">Trocar foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar}/></label>{avatarMessage && <div className={`avatar-message ${avatarMessage === 'Foto atualizada.' ? 'success' : 'error'}`} role="status">{avatarMessage}</div>}</div></div><form className="profile-form" onSubmit={saveProfile}><div className="form-section-title">Informações pessoais</div><div className="form-row"><label>Nome completo<input name="name" defaultValue={auth.user?.name || ''} required/></label><label>E-mail<input type="email" name="email" defaultValue={auth.user?.email || ''} required/></label></div><div className="form-section-title password-title">Alterar senha <small>Deixe em branco para manter a atual.</small></div><div className="form-row"><label>Senha atual<input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} autoComplete="current-password"/></label><label>Nova senha<input type="password" value={profilePassword} onChange={(e) => setProfilePassword(e.target.value)} autoComplete="new-password"/></label></div>{profileMessage && <div className="inline-message" role="status">{profileMessage}</div>}<div className="profile-actions"><span>Seus dados ficam protegidos e nunca mostramos sua senha.</span><button className="button button-primary">Salvar alterações <Icon name="arrow" size={15}/></button></div></form></section></>}
        {section === 'users' && auth.token && <><div className="page-heading"><div><span className="eyebrow">QUEM FAZ PARTE</span><h1>Pessoas<span className="heading-dot">.</span></h1><p>Encontre as pessoas que fazem parte do seu espaço.</p></div></div><section className="catalog-card people-card"><div className="catalog-head"><div><h2>Lista de pessoas</h2><p>Contas cadastradas no Mercado.</p></div></div>{usersLoading ? <div className="table-message">Carregando pessoas…</div> : users.length ? <div className="people-list">{users.map((person) => <div className="person-row" key={person.id}><Avatar className="avatar" user={person} fallbackName={person.name}/><div><strong>{person.name}</strong><span>{person.email}</span></div><span className="person-date">Desde {new Date(person.created_at).toLocaleDateString('pt-BR')}</span></div>)}</div> : <div className="table-message">Nenhuma pessoa encontrada.</div>}</section></>}
      </div>
    </main>
    {notice && <div className="toast"><span className="toast-check">✓</span>{notice}<button onClick={() => setNotice('')}><Icon name="close" size={15}/></button></div>}
    {dialog?.type === 'product' && <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setDialog(null) }}><section className="modal"><div className="modal-head"><div><span className="eyebrow">{dialog.product ? 'UM AJUSTE RÁPIDO' : 'MAIS UM BOM ACHADO'}</span><h2>{dialog.product ? 'Editar produto' : 'Novo produto'}</h2></div><button className="icon-button" onClick={() => setDialog(null)}><Icon name="close"/></button></div><form className="modal-form" onSubmit={submitProduct}><label>Nome do produto<input autoFocus required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="Ex.: Café especial"/></label><div className="form-row"><label>Preço <span className="input-prefix">R$<input required type="number" min="0.01" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} placeholder="0,00"/></span></label><label>Quantidade<input required type="number" min={dialog.product ? '0' : '1'} step="1" value={productForm.quantity} onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })} placeholder="0"/></label></div><div className="modal-actions">{dialog.product && !isDemo && <button type="button" className="delete-button" onClick={() => deleteProduct(dialog.product)}>Excluir produto</button>}<button type="button" className="button button-quiet" onClick={() => setDialog(null)}>Cancelar</button><button className="button button-primary">{dialog.product ? 'Salvar produto' : 'Adicionar produto'} <Icon name="arrow" size={15}/></button></div></form></section></div>}
  </div>
}

export default App
