import { redirect } from 'next/navigation'

// /crm is an orphaned duplicate of /contacts — redirect permanently
export default function CrmPage() {
  redirect('/contacts')
}
