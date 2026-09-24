import { useEffect, useRef, useState } from "react";

const URL = 'https://jsonplaceholder.typicode.com/users'
const HEADERS = { 'Content-Type': 'application/json' }

export default function App() {
  const [usuarios, setUsuarios] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  const [form, setForm] = useState({ name: '', email: '' })
  const [editandoId, setEditandoId] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [erroAcao, setErroAcao] = useState(null)

  // Exercício 5 — guarda o AbortController da operação em andamento (GET,
  // PUT, POST ou DELETE) para poder cancelá-la se o componente desmontar
  const controleRef = useRef(null)

  useEffect(() => {
    const controle = new AbortController()
    controleRef.current = controle

    async function buscar() {
      try {
        setCarregando(true)
        setErro(null)
        const resp = await fetch(URL, { signal: controle.signal })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        setUsuarios(await resp.json())
      } catch (e) {
        if (e.name !== "AbortError") setErro(e.message)
      } finally {
        setCarregando(false)
      }
    }

    buscar()

    // Cleanup: aborta a requisição em andamento (seja o GET inicial, um
    // PUT, um POST ou um DELETE) se o componente for desmontado
    return () => controleRef.current?.abort()

  }, [])

  function mudar(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function iniciarEdicao(usuario) {
    setEditandoId(usuario.id)
    setForm({ name: usuario.name, email: usuario.email })
  }

  function cancelar() {
    setEditandoId(null)
    setForm({ name: "", email: "" })
  }

  async function salvar(e) {
    e.preventDefault()

    if (!form.name.trim() || !form.email.trim()) {
      setErroAcao("Preencha todos os campos.")
      return
    }

    setEnviando(true)
    setErroAcao(null)

    const controle = new AbortController()
    controleRef.current = controle

    try {
      if (editandoId) {
        // PUT: id na URL
        const resp = await fetch(`${URL}/${editandoId}`, {
          method: 'PUT',
          headers: HEADERS,
          body: JSON.stringify(form),
          signal: controle.signal,
        })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const atualizado = await resp.json()
        setUsuarios(prev => prev.map(u => (u.id === editandoId ? atualizado : u)))
      } else {
        // POST: sem id na URL, o servidor devolve o recurso criado
        const resp = await fetch(URL, {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify(form),
          signal: controle.signal,
        })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const criado = await resp.json()
        // jsonplaceholder devolve sempre id=11; usamos Date.now() para não repetir a key
        setUsuarios(prev => [...prev, { ...criado, id: Date.now() }])
      }
      cancelar() // limpa o formulário só após sucesso
    } catch (e) {
      if (e.name !== 'AbortError') setErroAcao(e.message) // em erro, os campos permanecem preenchidos
    } finally {
      setEnviando(false)
    }
  }

  async function excluir(id) {
    const anterior = usuarios                          // guarda para desfazer
    setUsuarios(prev => prev.filter(u => u.id !== id)) // UI atualiza na hora
    setErroAcao(null)
    console.log(`Usuário ${id} excluído`) // Exercício 2

    const controle = new AbortController()
    controleRef.current = controle

    try {
      const resp = await fetch(`${URL}/${id}`, { method: 'DELETE', signal: controle.signal }) // sem body, sem headers
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    } catch (e) {
      if (e.name !== 'AbortError') {
        setUsuarios(anterior)                          // rollback
        setErroAcao(e.message)
      }
    }
  }

  if (carregando) return <p>Carregando...</p>
  if (erro) return <p>Erro: {erro}</p>

  return (
    <div>
      <h1>Usuários</h1>

      <form onSubmit={salvar}>
        <h2>{editandoId ? 'Editar usuário' : 'Novo usuário'}</h2>
        <input name="name" value={form.name} onChange={mudar} placeholder="Nome" />
        <input name="email" value={form.email} onChange={mudar} placeholder="E-mail" />
        <button disabled={enviando}>{editandoId ? 'Salvar' : 'Cadastrar'}</button>
        {editandoId && <button type="button" onClick={cancelar}>Cancelar</button>}
        {enviando && <p>Enviando...</p>}
        {erroAcao && <p>Erro: {erroAcao}</p>}
      </form>

      {usuarios.length === 0 ? (
        <p>Nenhum usuário encontrado.</p>
      ) : (
        <ul>
          {usuarios.map(u => (
            <li key={u.id}>
              {u.name} ({u.email}){' '}
              <button onClick={() => iniciarEdicao(u)}>Editar</button>
              <button onClick={() => excluir(u.id)}>Excluir</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

