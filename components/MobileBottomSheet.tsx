import React, { useState } from 'react';

const MobileBottomSheet = () => {
    const [isOpen, setIsOpen] = useState(false);

    const togglePanel = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div style={{ position: 'fixed', bottom: '0', left: '0', right: '0', zIndex: 1000 }}>
            <div style={{ display: isOpen ? 'block' : 'none', background: 'white', padding: '10px', borderTop: '1px solid #ccc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div><strong>Stats:</strong> Sample Stats Here</div>
                    <div>
                        <button onClick={() => alert('Action 1')}>Action 1</button>
                        <button onClick={() => alert('Action 2')}>Action 2</button>
                    </div>
                </div>
            </div>
            <button onClick={togglePanel} style={{ width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none' }}>
                {isOpen ? 'Hide' : 'Show'} Bottom Panel
            </button>
        </div>
    );
};

export default MobileBottomSheet;
