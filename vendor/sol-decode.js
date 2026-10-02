/* ---------------------------------------------------------------
   IRIS 35 — Solana transaction decoder.
   Pure: no DOM, no network. decodeSolanaTx(tx) returns
   {cls, programs, findings, changes}. findings are the desk notes,
   same order and wording the chain read used to build. changes is
   balanceChanges(tx): what left and what arrived, per account.
   --------------------------------------------------------------- */
var IrisSol=(function(){
var ALLOW={
"11111111111111111111111111111111":"System",
"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA":"SPL Token",
"TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb":"Token-2022",
"ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL":"ATA",
"ComputeBudget111111111111111111111111111111":"ComputeBudget",
"MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr":"Memo",
"Stake11111111111111111111111111111111111111":"Stake",
"Vote111111111111111111111111111111111111111":"Vote",
"AddressLookupTab1e1111111111111111111111111":"AddressLookupTable",
"JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4":"Jupiter v6",
"pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA":"Pump AMM",
"pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ":"Pump fee"
};
var MAX="18446744073709551615";
/* Native SOL wrapped as an SPL token. The same account also has a SOL
   delta (the lamports inside the token account). Both lines stay. */
var WSOL="So11111111111111111111111111111111111111112";

function ixList(tx){
  var outer=(tx.transaction&&tx.transaction.message&&tx.transaction.message.instructions)||[];
  var inner=[];
  ((tx.meta&&tx.meta.innerInstructions)||[]).forEach(function(g){(g.instructions||[]).forEach(function(ix){inner.push(ix);});});
  return outer.concat(inner);
}

/* Exact decimal string from an integer amount in base units.
   BigInt on the string form — never float math. Token amounts
   (uiTokenAmount.amount) arrive as strings and stay exact past 2^53.
   Live preBalances/postBalances are quoted before JSON.parse, so they
   arrive as exact strings. A number already parsed from JSON above
   2^53 (~9,007,199 SOL) is rounded and cannot be recovered. */
function units(raw,decimals){
  var v=BigInt(String(raw||"0")),neg=v<0n;
  if(neg)v=-v;
  var s=v.toString();
  if(decimals>0){
    while(s.length<=decimals)s="0"+s;
    var i=s.slice(0,s.length-decimals),f=s.slice(s.length-decimals).replace(/0+$/,"");
    s=f?i+"."+f:i;
  }
  return (neg?"-":"")+s;
}

/* Preserve SOL balance integers before JSON.parse can round them.
   The RPC arrays contain only integer lamport values. 1e17-style
   numbers are not expected from the RPC; only plain digits are quoted. */
function parseRpcResponseText(text){
  var quoted=String(text).replace(/("(?:preBalances|postBalances)"\s*:\s*\[)([^\]]*)(\])/g,function(_,open,body,close){
    return open+body.replace(/(^|,)(\s*)(\d+)(\s*)(?=,|$)/g,'$1$2"$3"$4')+close;
  });
  return JSON.parse(quoted);
}

/* Balance changes for every account the transaction touched.
   SOL from meta.preBalances/postBalances against accountKeys,
   tokens from meta.pre/postTokenBalances matched by accountIndex+mint.
   Exact string balances make equal values a reliable zero delta. Legacy
   callers may still pass JSON numbers; above 2^53, equal rounded numbers
   can hide a change smaller than the number's rounding step. A real
   difference is checked next: before/after/delta are exact decimal
   strings — or "UNKNOWN" when a SOL balance is unsafe
   ("balance too large to read exactly") or malformed
   ("balance unreadable").
   The fee payer (accountKeys[0]) pays the fee out of the same SOL
   balance, so its delta includes it; the note says so. */
function balanceChanges(tx){
  var meta=tx&&tx.meta;if(!meta)return [];
  var keys=((tx.transaction&&tx.transaction.message&&tx.transaction.message.accountKeys)||[])
    .map(function(k){return typeof k==="string"?k:String((k&&k.pubkey)||"");});
  var out=[];
  var pre=meta.preBalances||[],post=meta.postBalances||[];
  var n=Math.max(pre.length,post.length);
  for(var i=0;i<n;i++){
    /* Exact strings prove no movement. For legacy unsafe numbers this may
       miss a change smaller than the number's rounding step. */
    if(pre[i]===post[i])continue;
    /* Unsafe JSON numbers cannot be recovered; valid strings stay exact. */
    if((typeof pre[i]==="number"&&!Number.isSafeInteger(pre[i]))||
       (typeof post[i]==="number"&&!Number.isSafeInteger(post[i]))){
      out.push({account:keys[i]||("#"+i),owner:null,mint:null,before:"UNKNOWN",after:"UNKNOWN",delta:"UNKNOWN",note:"balance too large to read exactly"});
      continue;
    }
    var b,a,d;
    try{
      b=BigInt(String(pre[i]||0));a=BigInt(String(post[i]||0));d=a-b;
    }catch(e){
      out.push({account:keys[i]||("#"+i),owner:null,mint:null,before:"UNKNOWN",after:"UNKNOWN",delta:"UNKNOWN",note:"balance unreadable"});
      continue;
    }
    if(d===0n)continue;
    var c={account:keys[i]||("#"+i),owner:null,mint:null,before:units(b,9),after:units(a,9),delta:units(d,9)};
    if(i===0&&meta.fee)c.note="fee payer; delta includes the "+units(meta.fee,9)+" SOL fee";
    out.push(c);
  }
  var slots={},order=[];
  function slot(t){
    var k=t.accountIndex+":"+t.mint;
    if(!slots[k]){slots[k]={idx:t.accountIndex,mint:t.mint,owner:t.owner||null,decimals:(t.uiTokenAmount&&t.uiTokenAmount.decimals)|0,pre:"0",post:"0"};order.push(k);}
    else if(!slots[k].owner&&t.owner)slots[k].owner=t.owner;
    return slots[k];
  }
  (meta.preTokenBalances||[]).forEach(function(t){slot(t).pre=(t.uiTokenAmount&&t.uiTokenAmount.amount)||"0";});
  (meta.postTokenBalances||[]).forEach(function(t){slot(t).post=(t.uiTokenAmount&&t.uiTokenAmount.amount)||"0";});
  order.forEach(function(k){
    var s=slots[k],b=BigInt(s.pre),a=BigInt(s.post),d=a-b;
    if(d===0n)return;
    out.push({account:keys[s.idx]||("#"+s.idx),owner:s.owner,mint:s.mint,before:units(b,s.decimals),after:units(a,s.decimals),delta:units(d,s.decimals)});
  });
  return out;
}

function shortAddr(s){s=String(s||"");return s.length>12?s.slice(0,4)+"…"+s.slice(-4):s;}

/* Mint and decimals for each token account, from meta pre/postTokenBalances.
   Same accountIndex+mint slotting as balanceChanges. A closed account is
   only in pre; a fresh one only in post. First slot for an address wins. */
function tokenByAccount(tx){
  var meta=tx&&tx.meta;if(!meta)return {};
  var keys=((tx.transaction&&tx.transaction.message&&tx.transaction.message.accountKeys)||[])
    .map(function(k){return typeof k==="string"?k:String((k&&k.pubkey)||"");});
  var slots={},order=[];
  function slot(t){
    var k=t.accountIndex+":"+t.mint;
    if(!slots[k]){slots[k]={idx:t.accountIndex,mint:t.mint,decimals:(t.uiTokenAmount&&t.uiTokenAmount.decimals)|0};order.push(k);}
    return slots[k];
  }
  (meta.preTokenBalances||[]).forEach(slot);
  (meta.postTokenBalances||[]).forEach(slot);
  var by={};
  order.forEach(function(k){
    var s=slots[k],acct=keys[s.idx];
    if(acct&&by[acct]===undefined)by[acct]=s;
  });
  return by;
}

/* Legacy SPL amounts are base units with no decimals on the instruction.
   Look the token account up in the balance meta. If that mint is missing,
   keep the raw amount and say so — never a bare "?". */
function splText(raw,info,byAccount){
  var hit=byAccount[info.source]||byAccount[info.destination]||byAccount[info.account];
  if(hit&&hit.mint)return units(raw,hit.decimals)+" "+shortAddr(hit.mint);
  return String(raw)+" base units";
}

/* One plain line per change for the desk report:
   "−0.1 SOL  7K6x…pgeQ" or "+25 <mint> 6QsX…Kx22".
   Tokens name the owner (the wallet), not the token account.
   Wrapped SOL is labeled "wSOL (wrapped SOL)" so the token line
   does not read as a second native SOL delta. Other mints stay
   as the mint address until a symbol table exists. */
function formatChange(c){
  var who=shortAddr(c.mint?(c.owner||c.account):c.account);
  var asset=c.mint===WSOL?"wSOL (wrapped SOL)":(c.mint||"SOL");
  var head=c.delta==="UNKNOWN"?"?":((c.delta.charAt(0)==="-"?"−":"+")+c.delta.replace(/^-/,""));
  var line=head+" "+asset+"  "+who;
  if(c.note)line+="  ("+c.note+")";
  return line;
}

function decodeSolanaTx(tx){
  var ixs=ixList(tx),programs=[],findings=[],cls="A";
  var tokens=tokenByAccount(tx);
  if(tx.meta&&tx.meta.err)findings.push("transaction FAILED on chain");
  if(tx.blockTime)findings.push("time "+new Date(tx.blockTime*1000).toISOString());
  ixs.forEach(function(ix){
    var pid=String(ix.programId||"");
    var name=ALLOW[pid]||"UNKNOWN";
    var label=name==="UNKNOWN"?pid.slice(0,8)+"...":name;
    if(programs.indexOf(label)<0)programs.push(label);
    if(!ALLOW[pid]&&pid.length>20){
      cls="C";
      /* one line per unknown program, not per instruction that calls it */
      var unk="unknown program "+pid;
      if(findings.indexOf(unk)<0)findings.push(unk);
    }
    var parsed=ix.parsed||null;
    var typ=parsed&&parsed.type?parsed.type:"";
    var info=(parsed&&parsed.info)||{};
    var amt=info.amount||(info.tokenAmount&&info.tokenAmount.amount);
    if(typ==="approve"||typ==="approveChecked"){
      if(String(amt)===MAX){if(cls!=="C")cls="B";findings.push("UNLIMITED approve -> "+(info.delegate||"?"));}
      else findings.push("finite approve "+(amt!=null&&amt!==""?splText(amt,info,tokens):"?")+" -> "+(info.delegate||"?"));
    }
    if(typ==="revoke")findings.push("revoke (good)");
    if(typ==="setAuthority"){
      cls="C";
      findings.push("SetAuthority "+(info.authorityType||"?")+" -> "+(info.newAuthority===null?"revoked":(info.newAuthority||"?")));
    }
    if(typ==="closeAccount"){if(cls==="A")cls="B";findings.push("closeAccount -> "+(info.destination||"?"));}
    if(typ==="transfer"||typ==="transferChecked"){
      var moved;
      if(info.tokenAmount){
        var ui=info.tokenAmount.uiAmountString;
        if(ui===undefined||ui===null)ui=units(info.tokenAmount.amount,info.tokenAmount.decimals|0);
        moved=ui+" "+shortAddr(info.mint||"?");
      }else if(info.lamports!==undefined&&info.lamports!==null){
        moved=units(info.lamports,9)+" SOL";
      }else if(info.amount!=null&&info.amount!==""){
        moved=splText(info.amount,info,tokens);
      }else{
        moved="?";
      }
      findings.push("transfer "+moved+" -> "+(info.destination||"?"));
    }
  });
  if(!ixs.length){cls="C";findings.push("no instructions");}
  findings.unshift("programs "+programs.join(", "));
  return {cls:cls, programs:programs, findings:findings, changes:balanceChanges(tx)};
}

return {decodeSolanaTx:decodeSolanaTx, balanceChanges:balanceChanges, formatChange:formatChange, parseRpcResponseText:parseRpcResponseText};
})();

if(typeof module!=="undefined"&&module.exports)module.exports=IrisSol;
if(typeof window!=="undefined")window.IrisSol=IrisSol;
