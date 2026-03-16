import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Edit2, Globe, Lock, QrCode, Copy, Users, Trash2, Target } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { formatDate, generateShareUrl } from '@/lib/utils'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { currentProject, targets, fetchProject, fetchTargets, updateProject } = useProjectStore()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [collabEmail, setCollabEmail] = useState('')
  const [collaborators, setCollaborators] = useState<any[]>([])
  const shareUrl = generateShareUrl(projectId!)

  useEffect(() => {
    if (projectId) { fetchProject(projectId); fetchTargets(projectId); fetchCollaborators() }
  }, [projectId])

  useEffect(() => {
    if (currentProject) { setEditName(currentProject.name); setEditDesc(currentProject.description ?? '') }
  }, [currentProject])

  const fetchCollaborators = async () => {
    const { data } = await supabase.from('project_collaborators').select('*, profiles:user_id(email)').eq('project_id', projectId)
    if (data) setCollaborators(data)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await updateProject(projectId!, { name: editName, description: editDesc }); setEditing(false); toast.success('Project updated') }
    catch (err: any) { toast.error(err.message) }
  }

  const togglePublic = async () => {
    try {
      await updateProject(projectId!, { is_public: !currentProject?.is_public })
      toast.success(currentProject?.is_public ? 'Project made private' : 'Project is now public')
    } catch (err: any) { toast.error(err.message) }
  }

  const copyLink = () => { navigator.clipboard.writeText(shareUrl); toast.success('Share link copied!') }

  const inviteCollaborator = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: userFound } = await supabase.from('profiles').select('id').eq('email', collabEmail).single()
      if (!userFound) { toast.error('User not found'); return }
      const { error } = await supabase.from('project_collaborators').insert({ project_id: projectId, user_id: userFound.id, role: 'viewer' })
      if (error) throw error
      toast.success('Collaborator invited!'); setCollabEmail(''); fetchCollaborators()
    } catch (err: any) { toast.error(err.message) }
  }

  const removeCollaborator = async (id: string) => {
    const { error } = await supabase.from('project_collaborators').delete().eq('id', id)
    if (!error) { setCollaborators((c) => c.filter((x) => x.id !== id)); toast.success('Removed') }
  }

  if (!currentProject) return (
    <div className="p-6"><div className="skeleton w-48 h-8 mb-4 rounded" /><div className="skeleton w-full h-40 rounded-xl" /></div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      {/* Back + header */}
      <Link to="/dashboard" className="flex items-center gap-2 mb-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        <ArrowLeft size={15} /> Back to Dashboard
      </Link>

      <div className="glass rounded-2xl p-6 mb-6">
        {!editing ? (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>{currentProject.name}</h1>
              <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>{currentProject.description || 'No description'}</p>
              <div className="flex gap-2 flex-wrap">
                <span className={`badge ${currentProject.is_public ? 'badge-green' : 'badge-violet'}`}>
                  {currentProject.is_public ? <><Globe size={10} /> Public</> : <><Lock size={10} /> Private</>}
                </span>
                <span className="badge badge-cyan" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem' }}>{currentProject.id.slice(0, 8)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(true)} className="btn btn-ghost"><Edit2 size={15} /></button>
              <button onClick={togglePublic} className="btn btn-ghost">
                {currentProject.is_public ? <><Lock size={15} /> Make Private</> : <><Globe size={15} /> Make Public</>}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveEdit} className="space-y-3">
            <input value={editName} onChange={(e) => setEditName(e.target.value)} className="input text-lg font-bold" required />
            <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="input min-h-20 resize-y" placeholder="Project description..." />
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost">Cancel</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        )}

        {/* Share section */}
        <div className="mt-5 pt-5 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Share Link:</span>
            <code className="text-xs px-2 py-1 rounded flex-1 truncate" style={{ background: 'var(--color-surface)', color: 'var(--color-cyan)', fontFamily: 'var(--font-mono)' }}>{shareUrl}</code>
            <button onClick={copyLink} className="btn btn-ghost"><Copy size={14} /></button>
            <button onClick={() => setShowQR(!showQR)} className="btn btn-ghost"><QrCode size={14} /></button>
          </div>
          {showQR && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex justify-center">
              <div className="p-4 rounded-xl" style={{ background: '#fff' }}>
                <QRCodeSVG value={shareUrl} size={180} />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Targets list */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>Image Targets</h2>
            <Link to={`/projects/${projectId}/targets/new`} className="btn btn-primary"><Plus size={15} /> Add Target</Link>
          </div>
          <div className="space-y-3">
            {targets.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <Target size={32} className="mx-auto mb-3 opacity-30" />
                <p style={{ color: 'var(--color-text-muted)' }}>No targets yet. Add your first image target!</p>
              </div>
            ) : targets.map((target, i) => (
              <motion.div key={target.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                <Link to={`/projects/${projectId}/targets/${target.id}`}>
                  <div className="glass rounded-xl p-4 flex items-center gap-4 hover:border-cyan-400/30 transition-all cursor-pointer">
                    {target.reference_image_url ? (
                      <img src={target.reference_image_url} alt={target.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" style={{ border: '1px solid var(--color-border)' }} />
                    ) : (
                      <div className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                        <Target size={20} style={{ color: 'var(--color-text-muted)' }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{target.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {(target as any).ar_overlays?.[0]?.count ?? 0} overlays · {formatDate(target.created_at)}
                      </p>
                    </div>
                    <span className={`badge ${target.mind_file_url ? 'badge-green' : 'badge-violet'}`}>
                      {target.mind_file_url ? 'Compiled' : 'Pending'}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Collaborators panel */}
        <div>
          <h2 className="font-bold text-lg mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            <Users size={16} className="inline mr-2" />Collaborators
          </h2>
          <div className="glass rounded-xl p-4">
            <form onSubmit={inviteCollaborator} className="flex gap-2 mb-4">
              <input value={collabEmail} onChange={(e) => setCollabEmail(e.target.value)} className="input text-sm flex-1" placeholder="user@email.com" type="email" required />
              <button type="submit" className="btn btn-violet"><Plus size={14} /></button>
            </form>
            <div className="space-y-2">
              {collaborators.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm">{c.profiles?.email ?? 'Unknown'}</p>
                    <span className="badge badge-cyan">{c.role}</span>
                  </div>
                  <button onClick={() => removeCollaborator(c.id)} className="p-1 rounded" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {collaborators.length === 0 && <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>No collaborators yet</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
