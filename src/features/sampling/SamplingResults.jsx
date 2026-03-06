import { renderMarkdown } from '../../utils/markdown';
import ExportDropdown from '../../components/shared/ExportDropdown';

/**
 * Rendered sampling report with export actions.
 */
export default function SamplingResults({ rawContent, title, onReset }) {
  return (
    <>
      <div className="success-indicator">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>{title || 'Sampling calculation complete'}</span>
      </div>

      <div className="results-container">
        <div className="results-header">
          <span className="results-title">Required Sampling Report</span>
          <div className="results-actions">
            <ExportDropdown content={rawContent} title={title || 'Sampling Report'} />
            <button onClick={onReset}>New Calculation</button>
          </div>
        </div>
        <div className="doc-viewer-body" style={{ padding: 16 }}>
          <div
            className="doc-viewer-rendered"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(rawContent) }}
          />
        </div>
      </div>
    </>
  );
}
