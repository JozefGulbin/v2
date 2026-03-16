import ElderlyKidFriendlyNav from '../components/ElderlyKidFriendlyNav';

const IndexPage = () => {
    return (
        <div style={{ backgroundColor: 'green', color: 'white', padding: '20px' }}>
            <ElderlyKidFriendlyNav />
            <h1>Welcome to Our Spring Theme!</h1>
            <p>Enjoy the beautiful spring days with our fun activities!</p>
            <div className="mobile-layout">
                <p>This layout is optimized for mobile users.</p>
                <p>🌸 🌼 🌺</p>
            </div>
        </div>
    );
};

export default IndexPage;