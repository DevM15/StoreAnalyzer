import React, { useEffect, useState } from 'react';

function ToolList() {
    const [tools, setTools] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTools() {
            try {
                const response = await fetch(`http://localhost:3000/analytics`);
                const data = await response.json();
                setTools(data);
            } catch (error) {
                console.error('Error fetching tools:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchTools();
    }, []);

    if (loading) return <p>Loading...</p>;

    if (tools.length === 0) return <p>No Data</p>;

    return (
        <div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Tool Name</th>
                        <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>Views</th>
                    </tr>
                </thead>
                <tbody>
                    {tools.map(tool => (
                        <tr key={tool.toolName}>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{tool.toolName}</td>
                            <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>{tool.metrics}</td>
                        </tr>
                    ))}
                    <tr style={{ backgroundColor: '#dde48c' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold', border: '1px solid #ddd' }}>Total</td>
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #ddd' }}>
                            {tools.reduce((total, tool) => total + tool.metrics, 0)}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

export default ToolList;
