'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

type Note = {
  id: string
  title: string
  content: string
  created_at: string
}

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  // Инициализация Supabase клиента
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Загрузка заметок
  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Ошибка:', error)
        alert('Ошибка загрузки: ' + error.message)
        return
      }
      setNotes(data || [])
    } catch (error) {
      console.error('Ошибка загрузки:', error)
    } finally {
      setLoading(false)
    }
  }

  // Создание или обновление заметки
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      alert('Введите заголовок')
      return
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('notes')
          .update({ title, content })
          .eq('id', editingId)

        if (error) throw error
        alert('✅ Заметка обновлена!')
      } else {
        const { error } = await supabase
          .from('notes')
          .insert([{ title, content }])

        if (error) throw error
        alert('✅ Заметка создана!')
      }

      setTitle('')
      setContent('')
      setEditingId(null)
      fetchNotes()
    } catch (error: any) {
      console.error('Ошибка:', error)
      alert('❌ Ошибка: ' + error.message)
    }
  }

  // Удаление заметки
  const handleDelete = async (id: string) => {
    if (!confirm('Удалить заметку?')) return

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)

      if (error) throw error
      alert('✅ Заметка удалена!')
      fetchNotes()
    } catch (error: any) {
      console.error('Ошибка:', error)
      alert('❌ Ошибка: ' + error.message)
    }
  }

  // Редактирование заметки
  const handleEdit = (note: Note) => {
    setTitle(note.title)
    setContent(note.content || '')
    setEditingId(note.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Загрузка при монтировании
  useEffect(() => {
    fetchNotes()

    // Realtime подписка
    const channel = supabase
      .channel('notes_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes' },
        () => fetchNotes()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{
          color: 'white',
          textAlign: 'center',
          fontSize: '2.5rem',
          marginBottom: '30px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
        }}>
          🚀 Supabase + Vercel Test
        </h1>

        {/* Форма */}
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

        {/* Список заметок */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '30px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#333' }}>
            📋 Заметки ({notes.length})
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