import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface ARProject {
  id: string
  user_id: string
  name: string
  description?: string
  is_public: boolean
  created_at: string
  updated_at: string
  image_targets?: { count: number }[]
  project_collaborators?: { count: number }[]
}

export interface ImageTarget {
  id: string
  project_id: string
  user_id: string
  name: string
  reference_image_url: string
  mind_file_url?: string
  width: number
  created_at: string
  ar_overlays?: AROverlay[]
}

export interface AROverlay {
  id: string
  target_id: string
  user_id: string
  type: 'image' | 'video' | 'gif' | 'model3d' | 'text'
  content_url?: string
  content_text?: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: { x: number; y: number; z: number }
  opacity: number
  loop_video: boolean
  autoplay: boolean
  created_at: string
}

export interface Collaborator {
  id: string
  project_id: string
  user_id: string
  role: 'viewer' | 'editor' | 'admin'
  invited_at: string
}

interface ProjectState {
  projects: ARProject[]
  currentProject: ARProject | null
  targets: ImageTarget[]
  currentTarget: ImageTarget | null
  overlays: AROverlay[]
  loading: boolean
  // Actions
  fetchProjects: () => Promise<void>
  fetchProject: (id: string) => Promise<void>
  createProject: (data: Partial<ARProject>) => Promise<ARProject>
  updateProject: (id: string, data: Partial<ARProject>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  fetchTargets: (projectId: string) => Promise<void>
  fetchTarget: (targetId: string) => Promise<void>
  fetchOverlays: (targetId: string) => Promise<void>
  createOverlay: (data: Partial<AROverlay>) => Promise<AROverlay>
  updateOverlay: (id: string, data: Partial<AROverlay>) => Promise<void>
  deleteOverlay: (id: string) => Promise<void>
  setCurrentProject: (p: ARProject | null) => void
  setCurrentTarget: (t: ImageTarget | null) => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  targets: [],
  currentTarget: null,
  overlays: [],
  loading: false,

  fetchProjects: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('ar_projects')
      .select('*, image_targets(count), project_collaborators(count)')
      .order('updated_at', { ascending: false })
    if (!error && data) set({ projects: data as ARProject[] })
    set({ loading: false })
  },

  fetchProject: async (id) => {
    const { data } = await supabase
      .from('ar_projects')
      .select('*')
      .eq('id', id)
      .single()
    if (data) set({ currentProject: data })
  },

  createProject: async (data) => {
    const { data: created, error } = await supabase
      .from('ar_projects')
      .insert(data)
      .select()
      .single()
    if (error) throw error
    set((s) => ({ projects: [created, ...s.projects] }))
    return created
  },

  updateProject: async (id, data) => {
    const { error } = await supabase.from('ar_projects').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...data } : p)),
      currentProject: s.currentProject?.id === id ? { ...s.currentProject, ...data } : s.currentProject,
    }))
  },

  deleteProject: async (id) => {
    const { error } = await supabase.from('ar_projects').delete().eq('id', id)
    if (error) throw error
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }))
  },

  fetchTargets: async (projectId) => {
    set({ loading: true })
    const { data } = await supabase
      .from('image_targets')
      .select('*, ar_overlays(count)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (data) set({ targets: data })
    set({ loading: false })
  },

  fetchTarget: async (targetId) => {
    const { data } = await supabase
      .from('image_targets')
      .select('*')
      .eq('id', targetId)
      .single()
    if (data) set({ currentTarget: data })
  },

  fetchOverlays: async (targetId) => {
    const { data } = await supabase
      .from('ar_overlays')
      .select('*')
      .eq('target_id', targetId)
      .order('created_at', { ascending: true })
    if (data) set({ overlays: data as AROverlay[] })
  },

  createOverlay: async (data) => {
    const { data: created, error } = await supabase
      .from('ar_overlays')
      .insert(data)
      .select()
      .single()
    if (error) throw error
    set((s) => ({ overlays: [...s.overlays, created] }))
    return created
  },

  updateOverlay: async (id, data) => {
    const { error } = await supabase.from('ar_overlays').update(data).eq('id', id)
    if (error) throw error
    set((s) => ({ overlays: s.overlays.map((o) => (o.id === id ? { ...o, ...data } : o)) }))
  },

  deleteOverlay: async (id) => {
    const { error } = await supabase.from('ar_overlays').delete().eq('id', id)
    if (error) throw error
    set((s) => ({ overlays: s.overlays.filter((o) => o.id !== id) }))
  },

  setCurrentProject: (p) => set({ currentProject: p }),
  setCurrentTarget: (t) => set({ currentTarget: t }),
}))
