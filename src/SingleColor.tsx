import { getReadableTextColor } from "./utils.ts";

const LockIcon = ({ locked }: any) => {
    if (locked) {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4V7Z" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17 9h-7V7a2 2 0 0 1 3.4-1.4l1.4-1.4A4 4 0 0 0 8 7v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm0 11H7v-9h10v9Z" />
        </svg>
    );
};

const CopyIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm4 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h12v14Z" />
    </svg>
);

const SingleColor = ({ hex, locked, onToggleLock, onCopy, isActive }: any) => {
    const fg = getReadableTextColor(hex as string);
    return (
        <section
            className={`palette-col ${isActive ? "is-active" : ""}`}
            style={{ backgroundColor: hex, color: fg }}
            aria-label={`Color ${hex}`}
        >
            <div className="palette-col__top">
                <button
                    type="button"
                    className="icon-btn"
                    onClick={onToggleLock}
                    aria-pressed={locked}
                    aria-label={locked ? `Unlock ${hex}` : `Lock ${hex}`}
                    title={locked ? "Unlock" : "Lock"}
                >
                    <LockIcon locked={locked} />
                </button>

                <button
                    type="button"
                    className="icon-btn"
                    onClick={() => onCopy()}
                    aria-label={`Copy ${hex}`}
                    title="Copy hex"
                >
                    <CopyIcon />
                </button>
            </div>

            <button
                type="button"
                className="hex-btn"
                onClick={() => onCopy(hex)}
                aria-label={`Copy ${hex}`}
                title="Copy"
            >
                {hex}
            </button>

            <div className="palette-col__hint">
                <span className="kbd">Space</span> generate
            </div>
        </section>
    );
};

export default SingleColor;
