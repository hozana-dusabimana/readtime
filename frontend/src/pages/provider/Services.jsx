// Provider: my services.
import { useMemo } from 'react';
import { useSession } from '../../auth/SessionContext.jsx';
import { ServicesManager } from '../../components/ServicesManager.jsx';

export default function MyServices() {
    const { user } = useSession();
    const providers = useMemo(() => [user], [user]);
    return <ServicesManager providers={providers} />;
}
