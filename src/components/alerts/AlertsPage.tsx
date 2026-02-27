import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAlertsStore } from '../../stores/alertsStore';
import { AlertList } from './AlertList';
import { AlertForm } from './AlertForm';
import type { Alert } from '../../types';

export function AlertsPage() {
  const { alerts, addAlert, updateAlert, removeAlert } = useAlertsStore();
  const [editing, setEditing] = useState<Alert | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (alert: Alert) => {
    if (editing && editing.id === alert.id) {
      updateAlert(alert.id, alert);
      setEditing(null);
    } else if (!editing) {
      addAlert(alert);
      setShowForm(false);
    }
  };

  const handleEdit = (alert: Alert) => {
    setShowForm(false);
    setEditing(alert);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">アラート管理</h1>
        <button
          type="button"
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded bg-[var(--accent-blue)] text-white hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> アラート追加
        </button>
      </div>

      {(showForm || editing) ? (
        <div className="mb-6 max-w-xl">
          <AlertForm
            initial={editing}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </div>
      ) : null}

      <AlertList
        alerts={alerts}
        onEdit={handleEdit}
        onRemove={removeAlert}
        onToggleActive={(id, isActive) => updateAlert(id, { isActive })}
      />
    </div>
  );
}
