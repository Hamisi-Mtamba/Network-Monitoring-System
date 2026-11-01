import { paymentView,browsingUrl } from './payment-state';
import { PaymentStatusResponse } from '../models/payment.model';
const payment={id:1,transaction_reference:'ref',status:'successful',amount:500,payment_method:'selcom'};
const session={id:1,status:'active',started_at:'2026-10-03T10:00:00Z',expires_at:'2026-10-03T11:00:00Z'};
const now=Date.parse('2026-10-03T10:30:00Z');
describe('Payment and HotSpot state',()=>{
    it('does not show connected just because money was received',()=>{
        for(const value of [null,{...session,status:'pending_activation'},{...session,status:'failed'}])
            expect(paymentView({success:true,payment,session:value},now)).toBe('activating');
    });
    it('requires verified payment and active unexpired access',()=>{
        expect(paymentView({success:true,payment,session},now)).toBe('active');
        expect(paymentView({success:true,payment,session},now+3600000)).toBe('expired');
        expect(paymentView({success:true,payment,session:{...session,status:'suspended'}},now)).toBe('suspended');
        expect(paymentView({success:true,payment:{...payment,status:'pending'},session},now)).toBe('pending');
    });
    it('keeps cash waiting for explicit admin confirmation',()=>{
        expect(paymentView({success:true,payment:{...payment,status:'awaiting_cash_confirmation',payment_method:'cash'},session:null})).toBe('cash');
    });
    it('does not invent an expiry for incomplete data',()=>{
        expect(paymentView({success:true,payment,session:{...session,expires_at:'invalid'}},now)).toBe('activating');
    });
    it('accepts browsing URLs only with safe protocols and no embedded credentials',()=>{
        expect(browsingUrl('https://example.com/page')).toBe('https://example.com/page');
        for(const url of ['javascript:alert(1)','data:text/html,bad','https://user:pass@example.com','bad'])expect(browsingUrl(url)).toBe('https://www.google.com');
    });
});
