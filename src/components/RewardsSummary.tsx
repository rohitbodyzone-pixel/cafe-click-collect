import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useOrders } from '@/src/context/OrderContext';
import { useLoyalty } from '@/src/context/LoyaltyContext';
import { money } from '@/src/data/products';
import { colors } from '@/src/theme';

export function RewardsSummary({ editable = true }: { editable?: boolean }) {
  const { cart, promoCode, setPromoCode, redeemFreeCoffee, setRedeemFreeCoffee } = useOrders();
  const { promos, balance, settings } = useLoyalty();
  const [draft, setDraft] = useState(promoCode);
  useEffect(() => setDraft(promoCode), [promoCode]);
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const promo = promos.find(item => item.enabled && item.code === promoCode.trim().toUpperCase() && subtotal >= item.minimumSpend && (!item.expiresAt || new Date(item.expiresAt) >= new Date()));
  const promoDiscount = promo ? (promo.discountType === 'percent' ? subtotal * promo.discountValue / 100 : promo.discountValue) : 0;
  const coffees = cart.filter(item => item.product.category === 'Coffee');
  const coffeeCount = coffees.reduce((sum, item) => sum + item.quantity, 0);
  const canRedeem = settings.enabled && balance.freeCoffees > 0 && coffeeCount > 0;
  const freeDiscount = redeemFreeCoffee && canRedeem ? Math.min(...coffees.map(item => item.unitPrice), settings.freeCoffeeMaxCents / 100) : 0;
  const discount = Math.min(subtotal, promoDiscount + freeDiscount);
  const total = subtotal - discount;
  const pointsEarned = Math.floor(total * settings.pointsPerDollar);
  const progress = Math.min(100, (balance.coffeeStamps / settings.coffeeGoal) * 100);
  return <View style={s.box}>
    <Text style={s.title}>Rewards & promotions</Text>
    <View style={s.pointsCard}><Text style={s.pointsNumber}>{balance.points}</Text><View><Text style={s.pointsLabel}>loyalty points</Text><Text style={s.pointsHelp}>{settings.pointsPerDollar} point{settings.pointsPerDollar===1?'':'s'} earned per $1 spent</Text></View></View>
    <Text style={s.progressTitle}>Buy {settings.coffeeGoal} coffees, get 1 free</Text>
    <View style={s.progressTrack}><View style={[s.progressFill,{width:`${progress}%`}]} /></View>
    <Text style={s.progressText}>{balance.coffeeStamps} of {settings.coffeeGoal} coffee stamps · {Math.max(0,settings.coffeeGoal-balance.coffeeStamps)} until your next free coffee</Text>
    {balance.freeCoffees > 0 ? <View style={s.reward}><View style={{flex:1}}><Text style={s.rewardTitle}>🎉 Free coffee available</Text><Text style={s.rewardText}>{balance.freeCoffees} reward{balance.freeCoffees===1?'':'s'} ready to use{coffeeCount?' on this order':'. Add a coffee to redeem.'}</Text></View>{editable&&<Pressable disabled={!canRedeem} style={[s.rewardButton,redeemFreeCoffee&&s.rewardButtonActive,!canRedeem&&{opacity:.45}]} onPress={()=>setRedeemFreeCoffee(!redeemFreeCoffee)}><Text style={[s.rewardButtonText,redeemFreeCoffee&&{color:colors.white}]}>{redeemFreeCoffee?'Applied':'Use reward'}</Text></Pressable>}</View> : <Text style={s.noReward}>No free coffee reward available yet.</Text>}
    {editable&&<><Text style={s.promoLabel}>Promo code</Text><View style={s.promoRow}><TextInput style={s.input} value={draft} onChangeText={setDraft} autoCapitalize="characters" placeholder="Enter code"/><Pressable style={s.apply} onPress={()=>setPromoCode(draft.trim().toUpperCase())}><Text style={s.applyText}>Apply</Text></Pressable></View></>}
    {!!promoCode&&!promo&&<Text style={s.error}>Promo code is invalid, expired, or below its minimum spend.</Text>}
    {promo&&<View style={s.discountRow}><Text style={s.good}>Promo · {promo.code}</Text><Text style={s.good}>−{money(promoDiscount)}</Text></View>}
    {freeDiscount>0&&<View style={s.discountRow}><Text style={s.good}>Free coffee reward</Text><Text style={s.good}>−{money(freeDiscount)}</Text></View>}
    <View style={s.rule}/><View style={s.discountRow}><Text style={s.totalLabel}>Order total</Text><Text style={s.total}>{money(total)}</Text></View>
    <View style={s.earnBox}><Text style={s.earnStrong}>You’ll earn approximately {pointsEarned} points on this order.</Text>{coffeeCount>0&&<Text style={s.earn}>This order also adds {coffeeCount} coffee stamp{coffeeCount===1?'':'s'} toward your next free coffee.</Text>}</View>
  </View>;
}
const s=StyleSheet.create({box:{backgroundColor:colors.greenSoft,borderRadius:18,padding:15,marginTop:14},title:{color:colors.green,fontWeight:'800',fontSize:18},pointsCard:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:colors.white,borderRadius:14,padding:12,marginTop:11},pointsNumber:{fontSize:26,fontWeight:'900',color:colors.espresso},pointsLabel:{fontWeight:'800',color:colors.ink},pointsHelp:{color:colors.muted,fontSize:11,marginTop:2},progressTitle:{fontWeight:'800',color:colors.ink,marginTop:14},progressTrack:{height:9,borderRadius:6,backgroundColor:'#D7E4D9',overflow:'hidden',marginTop:8},progressFill:{height:'100%',backgroundColor:colors.green,borderRadius:6},progressText:{color:colors.muted,fontSize:11,marginTop:6},reward:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#FFF6DD',borderRadius:14,padding:12,marginTop:12,borderWidth:1,borderColor:'#EAD6A2'},rewardTitle:{fontWeight:'800',color:colors.espresso},rewardText:{color:colors.muted,fontSize:11,marginTop:3},rewardButton:{paddingHorizontal:12,paddingVertical:9,borderRadius:10,backgroundColor:colors.white,borderWidth:1,borderColor:colors.green},rewardButtonActive:{backgroundColor:colors.green},rewardButtonText:{color:colors.green,fontWeight:'800',fontSize:11},noReward:{color:colors.muted,fontSize:11,marginTop:10},promoLabel:{fontWeight:'800',color:colors.ink,marginTop:14},promoRow:{flexDirection:'row',gap:8,marginTop:7},input:{flex:1,height:46,backgroundColor:colors.white,borderWidth:1,borderColor:colors.line,borderRadius:12,paddingHorizontal:12,color:colors.ink},apply:{height:46,paddingHorizontal:17,borderRadius:12,backgroundColor:colors.espresso,alignItems:'center',justifyContent:'center'},applyText:{color:colors.white,fontWeight:'800'},error:{color:colors.danger,fontSize:12,marginTop:7},discountRow:{flexDirection:'row',justifyContent:'space-between',gap:12,marginTop:9},good:{color:colors.green,fontWeight:'800'},rule:{borderTopWidth:1,borderColor:'#C8D9CB',marginTop:13},totalLabel:{fontWeight:'800',color:colors.ink,fontSize:16},total:{fontWeight:'900',color:colors.espresso,fontSize:17},earnBox:{backgroundColor:colors.white,borderRadius:12,padding:11,marginTop:12},earnStrong:{color:colors.green,fontWeight:'800',fontSize:12},earn:{color:colors.muted,fontSize:11,marginTop:4,lineHeight:16}});
