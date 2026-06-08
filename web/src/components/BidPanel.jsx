import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Gavel, Clock, Lock, CheckCircle2 } from 'lucide-react';

function fmtMoney(n) {
  const v = Number(n || 0);
  return v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Countdown to ends_at; resyncs whenever ends_at changes (e.g. anti-snipe push).
function useCountdown(endsAt) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return { ended: true, label: 'Ended' };
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (x) => String(x).padStart(2, '0');
  const label = d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
  return { ended: false, label, urgent: ms < 60_000 };
}

export default function BidPanel({ itemId, startingBid }) {
  const { user } = useAuth();
  const [state, setState] = useState(null); // { current_bid, bid_count, reserve_met, winning_bidder_id, ends_at, ... }
  const [hasBid, setHasBid] = useState(false);
  const [maxAmount, setMaxAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const socketRef = useRef(null);

  // Initial state from the public bidding endpoint.
  useEffect(() => {
    let alive = true;
    api.itemBidState(itemId)
      .then((s) => { if (alive) setState(s); })
      .catch(() => {});
    return () => { alive = false; };
  }, [itemId]);

  // Has the current user already bid on this item? (drives "outbid")
  useEffect(() => {
    if (!user) { setHasBid(false); return; }
    let alive = true;
    api.myItemBids(itemId)
      .then((rows) => { if (alive) setHasBid(Array.isArray(rows) && rows.length > 0); })
      .catch(() => {});
    return () => { alive = false; };
  }, [itemId, user]);

  // Live updates: join this item's room, merge each push into local state.
  useEffect(() => {
    const socket = io({ path: '/socket.io/' });
    socketRef.current = socket;
    const join = () => socket.emit('join', itemId);
    socket.on('connect', join);
    socket.on('bid-update', (payload) => {
      if (!payload || payload.item_id !== itemId) return;
      setState((prev) => ({ ...(prev || {}), ...payload }));
    });
    return () => {
      socket.emit('leave', itemId);
      socket.disconnect();
    };
  }, [itemId]);

  const countdown = useCountdown(state?.ends_at);
  const currentBid = state?.current_bid != null ? Number(state.current_bid) : Number(startingBid || 0);
  const bidCount = state?.bid_count ?? 0;
  const reserveMet = !!state?.reserve_met;
  const winnerId = state?.winning_bidder_id ?? null;
  const youWin = !!user && winnerId && winnerId === user.id;
  const outbid = !!user && hasBid && winnerId && winnerId !== user.id;
  const closed = countdown?.ended;

  async function submit(e) {
    e.preventDefault();
    setError('');
    const amt = Number(maxAmount);
    if (!(amt > 0)) { setError('Enter a max bid amount.'); return; }
    setSubmitting(true);
    try {
      const res = await api.placeBid(itemId, amt);
      setHasBid(true);
      setMaxAmount('');
      // Apply our own result immediately; the socket push will also arrive.
      setState((prev) => ({
        ...(prev || {}),
        current_bid: res.current_bid,
        reserve_met: res.reserve_met,
        winning_bidder_id: res.winning_bidder_id,
        bid_count: res.bid_count,
        ends_at: res.ends_at ?? prev?.ends_at,
      }));
    } catch (err) {
      setError(err.message || 'Bid failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Current bid</div>
          <div className="font-display text-3xl text-gold">${fmtMoney(currentBid)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {bidCount} {bidCount === 1 ? 'bid' : 'bids'}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {reserveMet
            ? <Badge className="bg-green-600/20 text-green-300"><CheckCircle2 className="mr-1 h-3 w-3" />Reserve met</Badge>
            : <Badge className="bg-secondary text-muted-foreground"><Lock className="mr-1 h-3 w-3" />Reserve not met</Badge>}
          {countdown && (
            <span className={`inline-flex items-center gap-1 text-xs ${countdown.urgent ? 'text-red-300' : 'text-muted-foreground'}`}>
              <Clock className="h-3 w-3" />{countdown.label}
            </span>
          )}
        </div>
      </div>

      {(youWin || outbid) && (
        <div className={`mt-3 rounded-md px-3 py-2 text-sm font-semibold ${youWin ? 'bg-green-600/20 text-green-300' : 'bg-destructive/20 text-red-300'}`}>
          {youWin ? "You're winning" : "You've been outbid"}
        </div>
      )}

      {!user ? (
        <Link to="/login" className="mt-4 block">
          <Button className="w-full">Sign in to bid</Button>
        </Link>
      ) : closed ? (
        <div className="mt-4 text-center text-sm text-muted-foreground">Bidding has ended.</div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-2">
          <label className="text-xs text-muted-foreground">Your max bid</label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              placeholder={`$${fmtMoney(currentBid)}`}
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              disabled={submitting}
            />
            <Button type="submit" disabled={submitting}>
              <Gavel className="h-4 w-4" />{submitting ? 'Placing…' : 'Place Bid'}
            </Button>
          </div>
          {error && <p className="text-xs text-red-300">{error}</p>}
          <p className="text-xs text-muted-foreground">
            We bid on your behalf up to your max. Updates are live — no refresh needed.
          </p>
        </form>
      )}
    </div>
  );
}
