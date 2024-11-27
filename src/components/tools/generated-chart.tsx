import { motion as m } from "framer-motion";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartTypeRegistry,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js";
import { Chart, ChartProps } from "react-chartjs-2";
import { ErrorBoundary } from "react-error-boundary";
import { memo } from "react";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export type GeneratedChartProps = {
  config: {
    type: keyof ChartTypeRegistry;
    data: ChartProps["data"];
    options: ChartProps["options"];
  };
};

const GeneratedChart = memo(function GeneratedChart({
  config,
}: GeneratedChartProps) {
  const { type, data, options } = config;

  return (
    <ErrorBoundary
      fallbackRender={() => (
        <div className="bg-destructive-300 px-6 py-4 rounded-md">
          Error loading chart
        </div>
      )}
    >
      <m.div
        className="relative w-full h-[400px] overflow-x-auto"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1 },
        }}
        initial="hidden"
        animate="show"
      >
        <Chart
          className="w-full h-full"
          type={type}
          data={data}
          options={{
            ...options,
            maintainAspectRatio: false,
            responsive: true,
            scales: {
              ...options?.scales,
              x:
                type === "line" || type === "bar"
                  ? {
                      ...options?.scales?.x,
                      ticks: {
                        ...options?.scales?.x?.ticks,
                        // @ts-ignore
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 45,
                        maxTicksLimit: 20,
                        autoSkipPadding: 10,
                        align: "center",
                        crossAlign: "far",
                        padding: 8,
                      },
                    }
                  : options?.scales?.x,
            },
          }}
        />
      </m.div>
    </ErrorBoundary>
  );
});

export default GeneratedChart;
