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
        className="relative w-full max-w-2xl h-[50vw] max-h-96 my-8"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1 },
        }}
        initial="hidden"
        animate="show"
      >
        <Chart
          className="max-w-full max-h-full"
          type={type}
          data={data}
          options={{
            ...options,
            maintainAspectRatio: false,
          }}
        />
      </m.div>
    </ErrorBoundary>
  );
});

export default GeneratedChart;
