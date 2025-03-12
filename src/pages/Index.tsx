import NetworkTopology from "../components/NetworkTopology";

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2 dark:text-white">算艺轩网络拓扑图可视化</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-8">
          <NetworkTopology />
        </div>
      </div>
    </div>
  );
};

export default Index;
