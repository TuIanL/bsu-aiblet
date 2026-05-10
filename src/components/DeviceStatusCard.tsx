import { Battery, BluetoothConnected, RadioTower, Shirt } from "lucide-react";
import { MetricCard } from "./MetricCard";
import type { DeviceStatus } from "../types";

interface DeviceStatusCardProps {
  device: DeviceStatus;
}

export function DeviceStatusCard({ device }: DeviceStatusCardProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        title="设备电量"
        value={device.battery}
        unit="%"
        detail="低功耗采集模式"
        icon={Battery}
        tone={device.battery > 75 ? "green" : "yellow"}
      />
      <MetricCard
        title="连接状态"
        value={device.connectionStatus}
        detail={`同步时间 ${device.lastSyncTime}`}
        icon={BluetoothConnected}
        tone={device.connectionStatus === "已连接" ? "green" : "yellow"}
      />
      <MetricCard
        title="护腰佩戴"
        value={device.wearingStatus}
        detail="来自贴合度与 TENG 信号质量"
        icon={Shirt}
        tone={device.wearingStatus === "佩戴良好" ? "green" : "orange"}
      />
      <MetricCard
        title="信号质量"
        value={`${device.tengSignalQuality}/${device.imuSignalQuality}`}
        detail="TENG / IMU"
        icon={RadioTower}
        tone="blue"
      />
    </div>
  );
}
