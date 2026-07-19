import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import StatCard from '../components/StatCard'
import PerformanceChart from '../components/PerformanceChart'
import TradesTable from '../components/TradesTable'
import RiskWidget from '../components/RiskWidget'
import ConnectionsPanel from '../components/ConnectionsPanel'
import CopierPanel from '../components/CopierPanel'

export default function Dashboard() {
  return (
    <div className="layout">
      <Sidebar />

      <div className="main">
        <Topbar />

        {/* TOP STATS */}
        <div className="grid-4">
          <StatCard title="Balance Total" value="$152,430.75" />
          <StatCard title="Cuentas" value="6" />
          <StatCard title="Operaciones" value="14" />
          <StatCard title="Sistema" value="Operativo" />
        </div>

        {/* MIDDLE SECTION */}
        <div className="grid-3">
          <PerformanceChart />
          <ConnectionsPanel />
          <CopierPanel />
        </div>

        {/* BOTTOM */}
        <div className="grid-2">
          <TradesTable />
          <RiskWidget />
        </div>
      </div>
    </div>
  )
}