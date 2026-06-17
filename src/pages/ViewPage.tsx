import { useParams } from 'react-router-dom'
import { FlipbookViewScreen } from './FlipbookViewScreen'

export function ViewPage() {
  const { id } = useParams<{ id: string }>()
  return <FlipbookViewScreen id={id} />
}
