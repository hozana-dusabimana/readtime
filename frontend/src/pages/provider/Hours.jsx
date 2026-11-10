// Provider: my weekly working hours.
import { useSession } from '../../auth/SessionContext.jsx';
import { HoursEditor } from '../../components/HoursEditor.jsx';

export default function MyHours() {
    const { user } = useSession();
    return <HoursEditor providerId={user.id} />;
}
