import { Routes, Route, useLocation } from 'react-router-dom';

import React, { useEffect } from 'react';
import ProcessModelEditDiagram from './ProcessModelEditDiagram';
import ErrorDisplay from '../components/ErrorDisplay';

export default function EditorRoutes() {
  const location = useLocation();

  useEffect(() => {}, [location]);

  return (
    <div className="full-width-container no-center-stuff">
      <ErrorDisplay />
      <Routes>
        <Route
          path="process-models/:process_model_id/files"
          element={<ProcessModelEditDiagram />}
        />
        <Route
          path="process-models/:process_model_id/files/:file_name"
          element={<ProcessModelEditDiagram />}
        />
      </Routes>
    </div>
  );
}
