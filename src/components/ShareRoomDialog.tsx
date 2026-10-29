import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Share2, Smartphone, X } from 'lucide-react';
import { useDialogFocus } from './useDialogFocus';

export function ShareRoomDialog({ roomId, hasPassword = false, onClose }: { roomId: string; hasPassword?: boolean; onClose: () => void }) {
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const panelRef = useDialogFocus(true, onClose);
  const link = (() => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    return url.toString();
  })();

  useEffect(() => {
    void QRCode.toDataURL(link, {
      width: 520,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#100d09', light: '#f0ddba' }
    }).then(setQr);
  }, [link]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      const input = document.createElement('textarea');
      input.value = link;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
      setCopied(true);
    }
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: '将·界 · 好友对局邀请', text: `房间码 ${roomId}，邀你对弈一局`, url: link });
    } else {
      await copy();
    }
  };

  return (
    <div className="modal-layer share-room-layer" role="dialog" aria-modal="true" aria-labelledby="share-room-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="关闭邀请" />
      <section ref={panelRef} className="share-room-panel">
        <button className="panel-close" onClick={onClose} aria-label="关闭邀请"><X size={18} /></button>
        <header>
          <span className="setup-kicker"><Smartphone size={14} />邀请好友</span>
          <h2 id="share-room-title">扫码或分享链接入席</h2>
          <p>手机扫描二维码可直接加入。微信内可通过系统分享卡片发送给好友。{hasPassword ? ' 此房间设置了密码，请通过其他安全方式单独告知。' : ''}</p>
        </header>
        <div className="share-room-body">
          <div className="qr-frame">{qr ? <img src={qr} alt={`房间 ${roomId} 邀请二维码`} /> : <span>生成中…</span>}</div>
          <div className="share-room-info">
            <small>房间码</small>
            <strong>{roomId}</strong>
            <p>{link}</p>
            <button onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? '链接已复制' : '复制邀请链接'}</button>
            <button className="panel-primary" onClick={() => void share()}><Share2 size={16} />系统分享 / 微信</button>
          </div>
        </div>
      </section>
    </div>
  );
}
