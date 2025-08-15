import React, { useState, useEffect } from "react";
import { type TechTree, getKnownTrees, validate } from "./TechTree.js";

interface HomeProps {
  onOpen: (tree: TechTree) => void;
  onKnown: (knownTree: string) => void;
  onNew: () => void;
}

const Home: React.FC<HomeProps> = (props: HomeProps) => {
  const [selectedTechTree, setSelectedTechTree] = useState("");
  const [knownTrees, setKnownTrees] = useState<string[]>([]);

  useEffect(() => {
    const fetchKnownTrees = async () => {
      try {
        const trees = await getKnownTrees();
        setKnownTrees(trees);
      } catch (err) {
        console.error(err);
      }
    };
    fetchKnownTrees();
  }, []);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const text = await file.text();
      const tree = validate(JSON.parse(text));
      props.onOpen(tree);
    }
  };

  const handleLoadTechTree = () => {
    if (selectedTechTree) {
      props.onKnown(selectedTechTree);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        {/* Header with favicon and title */}
        <div className="text-center mb-8">
          <img
            src="/favicon.svg"
            alt="Tech Tree"
            className="w-16 h-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-800">Tech Tree</h1>
        </div>

        {/* Tech tree selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Tech Tree
          </label>
          <select
            value={selectedTechTree}
            onChange={(e) => setSelectedTechTree(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Choose...</option>
            {knownTrees.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <button
            onClick={handleLoadTechTree}
            disabled={!selectedTechTree}
            className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Load
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>

        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Load from File
          </label>
          <input
            type="file"
            onChange={handleFileUpload}
            accept=".json,.xml,.yaml,.yml"
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="w-full inline-flex justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Choose File
          </label>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>

        {/* Create new tech tree */}
        <div>
          <button
            onClick={props.onNew}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2 inline"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create New
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
