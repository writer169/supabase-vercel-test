'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

type Note = {
  id: string
  title: string
  content: string
  created_at: string
  user_id: string
}

type User = {
  id: string
  email: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Auth форма
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Проверка авторизации при загрузке
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user as User || null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user as User || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Загрузка заметок (только для авторизованных)
  const fetchNotes = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Ошибка:', error)
        return
      }
      setNotes(data || [])
    } catch (error) {
      console.error('Ошибка загрузки:', error)
    }
  }

  // Real-time подписка
  useEffect(() => {
    if (!user) return

    fetchNotes()

    const channel = supabase
      .channel('notes_changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'notes',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchNotes()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Регистрация
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      alert('✅ Проверьте email для подтверждения регистрации!')
      setEmail('')
      setPassword('')
    } catch (error: any) {
      alert('❌ Ошибка: ' + error.message)
    }
  }

  // Вход
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      alert('✅ Вы вошли в систему!')
      setEmail('')
      setPassword('')
    } catch (error: any) {
      alert('❌ Ошибка: ' + error.message)
    }
  }

  // Выход
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setNotes([])
    alert('👋 Вы вышли из системы')
  }

  // Создание/обновление заметки
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !user) return

    try {
      if (editingId) {
        const { error } = await supabase
          .from('notes')
          .update({ title, content })
          .eq('id', editingId)
          .eq('user_id', user.id)

        if (error) throw error
        alert('✅ Заметка обновлена!')
      } else {
        const { error } = await supabase
          .from('notes')
          .insert([{ title, content, user_id: user.id }])

        if (error) throw error
        alert('✅ Заметка создана!')
      }

      setTitle('')
      setContent('')
      setEditingId(null)
    } catch (error: any) {
      alert('❌ Ошибка: ' + error.message)
    }
  }

  // Удаление заметки
  const handleDelete = async (id: string) => {
    if (!confirm('Удалить заметку?') || !user) return

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
      alert('✅ Заметка удалена!')
    } catch (error: any) {
      alert('❌ Ошибка: ' + error.message)
    }
  }

  const handleEdit = (note: Note) => {
    setTitle(note.title)
    setContent(note.content || '')
    setEditingId(note.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <p style={{ color: 'white', fontSize: '1.5rem' }}>⏳ Загрузка...</p>
      </div>
    )
  }

  // Форма авторизации
  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
        }}>
          <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
            🔐 {authMode === 'signin' ? 'Вход' : 'Регистрация'}
          </h1>
          
          <form onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#555' }}>
                Email:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="ваш@email.com"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  outline: 'none'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#555' }}>
                Пароль:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Минимум 6 символов"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  outline: 'none'
                }}
              />
            </div>
            
            <button
              type="submit"
              style={{
                width: '100%',
                background: '#667eea',
                color: 'white',
                border: 'none',
                padding: '14px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '15px'
              }}
            >
              {authMode === 'signin' ? '🔓 Войти' : '📝 Зарегистрироваться'}
            </button>
          </form>
          
          <p style={{ textAlign: 'center', color: '#666' }}>
            {authMode === 'signin' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
            {' '}
            <button
              onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                fontWeight: '600',
                textDecoration: 'underline'
              }}
            >
              {authMode === 'signin' ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </p>
        </div>
      </div>
    )
  }

  // Основное приложение (для авторизованных)
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{
            color: 'white',
            fontSize: '2rem',
            textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
            margin: 0
          }}>
            🚀 Мои заметки
          </h1>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: 'white', marginBottom: '8px', fontSize: '0.9rem' }}>
              👤 {user.email}
            </p>
            <button
              onClick={handleSignOut}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '2px solid white',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              🚪 Выйти
            </button>
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '30px',
          marginBottom: '25px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#333' }}>
            {editingId ? '✏️ Редактирование' : '📝 Новая заметка'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#555' }}>
                Заголовок:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Введите заголовок"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#555' }}>
                Содержание:
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Введите текст заметки"
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="submit"
                style={{
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  padding: '12px 28px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {editingId ? '💾 Сохранить' : '➕ Создать'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setTitle('')
                    setContent('')
                    setEditingId(null)
                  }}
                  style={{
                    background: '#95a5a6',
                    color: 'white',
                    border: 'none',
                    padding: '12px 28px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  ❌ Отмена
                </button>
              )}
            </div>
          </form>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '30px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#333' }}>
            📋 Мои заметки ({notes.length})
          </h2>
          {notes.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#95a5a6', padding: '40px 0' }}>
              📭 Заметок пока нет. Создайте первую!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {notes.map((note) => (
                <div
                  key={note.id}
                  style={{
                    background: '#f8f9fa',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #e9ecef'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '10px',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <h3 style={{ color: '#2c3e50', fontSize: '1.3rem', margin: 0 }}>
                      {note.title}
                    </h3>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleEdit(note)}
                        style={{
                          background: '#3498db',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                      >
                        ✏️ Изменить
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        style={{
                          background: '#e74c3c',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                      >
                        🗑️ Удалить
                      </button>
                    </div>
                  </div>
                  {note.content && (
                    <p style={{
                      color: '#555',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      marginBottom: '10px'
                    }}>
                      {note.content}
                    </p>
                  )}
                  <p style={{ color: '#95a5a6', fontSize: '0.9rem', margin: 0 }}>
                    🕐 {new Date(note.created_at).toLocaleString('ru-RU')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}