import pb from '@/lib/pocketbase/client'
import type { TaskItem } from '@/types/vendasPro'

export async function listTasks(filter = '') {
  return pb.collection<TaskItem>('tasks').getFullList({
    filter: filter || undefined,
    sort: '+vencimento,-created',
    expand: 'responsavel_id,owner',
  })
}

export async function createTask(data: Partial<TaskItem>) {
  return pb.collection<TaskItem>('tasks').create(
    {
      owner: pb.authStore.record?.id,
      responsavel_id: data.responsavel_id || pb.authStore.record?.id,
      status: 'pendente',
      prioridade: 'media',
      tipo: 'outro',
      ...data,
    },
    { expand: 'responsavel_id,owner' },
  )
}

export async function updateTask(id: string, data: Partial<TaskItem>) {
  return pb.collection<TaskItem>('tasks').update(id, data, {
    expand: 'responsavel_id,owner',
  })
}

export async function toggleTaskCompletion(id: string, currentlyCompleted: boolean) {
  const newStatus = currentlyCompleted ? 'pendente' : 'concluida'
  const concluida_em = currentlyCompleted ? null : new Date().toISOString()
  return pb.collection<TaskItem>('tasks').update(id, {
    status: newStatus,
    concluida_em,
  })
}

export async function deleteTask(id: string) {
  return pb.collection('tasks').delete(id)
}
