export const TailwindTest = () => {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Tailwind CSS Installation Test</h2>
      
      {/* Test 1: Colors */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">1. Color System</h3>
        <div className="flex space-x-2">
          <div className="w-12 h-12 bg-blue-500 rounded"></div>
          <div className="w-12 h-12 bg-green-500 rounded"></div>
          <div className="w-12 h-12 bg-red-500 rounded"></div>
          <div className="w-12 h-12 bg-yellow-500 rounded"></div>
          <div className="w-12 h-12 bg-purple-500 rounded"></div>
        </div>
      </div>
      
      {/* Test 2: Spacing */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">2. Spacing System</h3>
        <div className="space-y-4">
          <div className="h-4 bg-gray-300 rounded"></div>
          <div className="h-4 bg-gray-300 rounded ml-4"></div>
          <div className="h-4 bg-gray-300 rounded ml-8"></div>
          <div className="h-4 bg-gray-300 rounded ml-12"></div>
        </div>
      </div>
      
      {/* Test 3: Responsive */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">3. Responsive Design</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-100 rounded">Mobile</div>
          <div className="p-4 bg-green-100 rounded">Tablet</div>
          <div className="p-4 bg-purple-100 rounded">Desktop</div>
        </div>
      </div>
      
      {/* Test 4: Interactive */}
      <div>
        <h3 className="font-semibold mb-2">4. Interactive States</h3>
        <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 active:scale-95 transition-all">
          Hover & Click Test
        </button>
      </div>
    </div>
  )
}