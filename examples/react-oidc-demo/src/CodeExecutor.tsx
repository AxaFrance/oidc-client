import { OidcClient } from '@axa-fr/oidc-client';
import React, { useState } from 'react';

// @ts-ignore
window.OidcClient = OidcClient;
const CodeExecutor: React.FC = () => {
    const [code, setCode] = useState<string>('');
    const [output, setOutput] = useState<string>('');
    
    const executeCode = () => {
        try {
            const result = eval(`
                (function() {
                    ${code}
                })()
            `);
            setOutput(String(result));
        } catch (error) {
            setOutput(`Erreur : ${(error as Error).message}`);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <h2>Execute your JavaScript Code</h2>
            <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Write your JavaScript code here..."
                rows={10}
                style={{ width: '100%', marginBottom: '10px' }}
            ></textarea>
            <button onClick={executeCode} style={{ padding: '10px 20px' }}>
                Execute the code
            </button>
            <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5' }}>
                <h3>Result :</h3>
                <pre>{output}</pre>
            </div>
        </div>
    );
};

export default CodeExecutor;
