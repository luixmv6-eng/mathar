import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Search, LayoutGrid, List, Target, Users, Eye, Trash2, MoreVertical, FolderOpen } from 'lucide-react'
import { useProjectStore, type ARProject } from '@/stores/projectStore'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { projects, loading, fetchProjects, createProject, deleteProject } = useProjectStore()
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { fetchProjects() }, [])

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const totalTargets = projects.reduce((a, p) => a + ((p as any).image_targets?.[0]?.count ?? 0), 0)
  const totalCollabs = projects.reduce((a, p) => a + ((p as any).project_collaborators?.[0]?.count ?? 0), 0)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const project = await createProject({ name: newName.trim(), user_id: user?.id, is_public: false })
      toast.success('Project created!')
      setShowCreate(false)
      setNewName('')
      navigate(`/projects/${project.id}`)
    } catch (err: any) { toast.error(err.message) }
    finally { setCreating(false) }
  }

  const handleDelete = async (p: ARProject, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    try { await deleteProject(p.id); toast.success('Project deleted') }
    catch (err: any) { toast.error(err.message) }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          Welcome back, {user?.user_metadata?.full_name ?? user?.email?.split('@')[0]}
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Projects', value: projects.length, icon: FolderOpen, color: '#00F5FF' },
          { label: 'AR Targets', value: totalTargets, icon: Target, color: '#7B2FFF' },
          { label: 'Collaborators', value: totalCollabs, icon: Users, color: '#22c55e' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>{value}</p>
          </div>
        ))}
      </motion.div>

      {/* Actions bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder="Search projects..." />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView(view === 'grid' ? 'list' : 'grid')} className="btn btn-ghost">
            {view === 'grid' ? <List size={16} /> : <LayoutGrid size={16} />}
          </button>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary">
            <Plus size={16} /> New Project
          </button>
        </div>
      </div>

      {/* Create project modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="glass rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>New AR Project</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Project Name</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} className="input" placeholder="My AR Experience" required autoFocus />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={creating} className="btn btn-primary flex-1">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Projects grid/list */}
      {loading ? (
        <div className={`grid gap-4 ${view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton rounded-xl" style={{ height: '180px' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center opacity-30" style={{ border: '2px dashed var(--color-border)' }}>
            <FolderOpen size={28} style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <p style={{ color: 'var(--color-text-muted)' }}>{search ? 'No projects match your search' : 'No projects yet. Create your first!'}</p>
          {!search && <button onClick={() => setShowCreate(true)} className="btn btn-primary"><Plus size={16} /> Create Project</button>}
        </div>
      ) : (
        <motion.div layout className={`grid gap-4 ${view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {filtered.map((project, i) => (
            <motion.div key={project.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}>
              <Link to={`/projects/${project.id}`}>
                <div className="glass rounded-xl p-5 hover:border-cyan-400/30 transition-all group cursor-pointer"
                  style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate mb-1" style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{project.description}</p>
                      )}
                    </div>
                    <button onClick={(e) => handleDelete(project, e)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 rounded"
                      style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <span className="flex items-center gap-1"><Target size={12} />{(project as any).image_targets?.[0]?.count ?? 0} targets</span>
                    <span className="flex items-center gap-1"><Users size={12} />{(project as any).project_collaborators?.[0]?.count ?? 0} collabs</span>
                    {project.is_public && <span className="flex items-center gap-1 badge badge-green"><Eye size={10} /> Public</span>}
                  </div>
                  <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>
                      {formatDate(project.updated_at)}
                    </span>
                    <span className="text-xs font-medium" style={{ color: 'var(--color-cyan)' }}>Open →</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
