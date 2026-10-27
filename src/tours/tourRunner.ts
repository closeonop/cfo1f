import type { Driver } from "driver.js";
import { tourSelector, type TourStep } from "./tourConfig";

export const escapeTourText = (value:string) => value.replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]!));
export function visibleTourElement(anchor:string):HTMLElement | null {
  const element=document.querySelector<HTMLElement>(tourSelector(anchor));
  return element && element.getClientRects().length && getComputedStyle(element).visibility !== "hidden" ? element : null;
}

/** Wait for React portals and async content; always bounded and abortable. */
export function waitForTourElement(anchor:string,signal:AbortSignal,timeout=4000):Promise<HTMLElement> {
  return new Promise((resolve,reject) => {
    const found=visibleTourElement(anchor);
    if (signal.aborted) {reject(new DOMException("Tour interrupted","AbortError"));return;}
    if (found) {resolve(found);return;}
    const cleanup=() => {observer.disconnect();clearTimeout(timer);signal.removeEventListener("abort",abort);};
    const inspect=() => {const target=visibleTourElement(anchor);if(target){cleanup();resolve(target);}};
    const observer=new MutationObserver(inspect);
    const abort=() => {cleanup();reject(new DOMException("Tour interrupted","AbortError"));};
    const timer=setTimeout(()=>{cleanup();reject(new Error(`Walkthrough target unavailable: ${anchor}`));},timeout);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["style","data-state","hidden"]});
    signal.addEventListener("abort",abort,{once:true});inspect();
  });
}

export function presentTourSteps(steps:TourStep[]):TourStep[] {
  return steps.filter(step => {
    if(step.dialog) {
      const opener=visibleTourElement(step.dialog.opener);
      return !!opener && !(opener instanceof HTMLButtonElement && opener.disabled);
    }
    return !!visibleTourElement(step.element);
  });
}

export async function runTour(steps:TourStep[],signal:AbortSignal,onFinish:()=>void,onError:(error:unknown)=>void) {
  const {driver}=await import("driver.js");
  if(signal.aborted) return {stop:()=>{}};
  let instance:Driver;
  let stopped=false, moving=false, preparing=false;
  const ownedDialogs=new Set<string>();
  const pressControl=(control:HTMLElement) => {preparing=true;try{control.click();}finally{preparing=false;}};
  const closeDialog=(root:string) => {
    if(!ownedDialogs.has(root))return;
    const close=document.querySelector<HTMLButtonElement>(`${tourSelector(root)} ${tourSelector("dialog-close")}`);
    if(close)pressControl(close);
    ownedDialogs.delete(root);
  };
  const stop=() => {
    if(stopped)return;
    stopped=true;instance.destroy();ownedDialogs.forEach(closeDialog);
    document.removeEventListener("click",guard,true);document.removeEventListener("submit",guard,true);
    document.removeEventListener("beforeinput",guard,true);document.removeEventListener("change",guard,true);
    document.body.removeAttribute("data-portal-tour");
  };
  const finish=() => {if(stopped)return;stop();onFinish();};
  async function go(index:number,direction=1) {
    if(stopped || moving || signal.aborted)return;
    if(index>=steps.length){finish();return;}
    if(index<0)return;
    moving=true;
    try {
      const step=steps[index];
      if(step.activate)ownedDialogs.forEach(closeDialog);
      if(step.close)closeDialog(step.close);
      if(step.dialog && !visibleTourElement(step.dialog.root)) {
        const opener=visibleTourElement(step.dialog.opener);
        if(!opener)throw new Error("The form is no longer available.");
        ownedDialogs.add(step.dialog.root);pressControl(opener);
      }
      await waitForTourElement(step.element,signal);
      if(stopped || signal.aborted)return;
      instance.drive(index);
    } catch(error) {
      if(signal.aborted || stopped)return;
      // A conditional field may disappear while data refreshes. Never show a dummy spotlight.
      if(steps[index]?.optional){moving=false;void go(index+direction,direction);return;}
      stop();onError(error);
    } finally {moving=false;}
  }
  instance=driver({
    animate:!matchMedia("(prefers-reduced-motion: reduce)").matches,
    duration:180, smoothScroll:false, overlayColor:"#15151f", overlayOpacity:0.65,
    stageRadius:14,stagePadding:7,popoverOffset:12,popoverClass:"portal-tour",
    allowClose:true,overlayClickBehavior:"none",allowKeyboardControl:true,
    showProgress:true,progressText:"{{current}} of {{total}}",showButtons:["next","previous","close"],
    nextBtnText:"Next",prevBtnText:"Back",doneBtnText:"Done",closeBtnLabel:"Skip walkthrough",
    disableActiveInteraction:true,
    onNextClick:(_element,_step,{index})=>{void go((index??0)+1);},
    onPrevClick:(_element,_step,{index})=>{void go((index??0)-1,-1);},
    onDoneClick:finish,onCloseClick:finish,onDestroyStarted:finish,
    onPopoverRender:(popover,{index})=>{
      const step=steps[index??0];
      popover.wrapper.setAttribute("role","dialog");
      popover.wrapper.setAttribute("aria-label",step.title);
      popover.footer.querySelector(".portal-tour-skip")?.remove();
      const skip=document.createElement("button");skip.type="button";skip.textContent="Skip";
      skip.className="driver-popover-footer-btn portal-tour-skip";skip.onclick=finish;
      popover.footer.insertBefore(skip,popover.footerButtons);
    },
    steps:steps.map((step,index)=>({
      element:tourSelector(step.element),disableActiveInteraction:!step.activate,
      popover:{title:escapeTourText(step.title),description:escapeTourText(step.description),side:"bottom",align:"start"},
      onHighlighted:element=>{
        if(!step.activate || !element)return;
        element.addEventListener("click",()=>{
          const next=steps[index+1];if(next?.dialog)ownedDialogs.add(next.dialog.root);
          // Let the real React click open the form before asking for its field.
          setTimeout(()=>{void go(index+1);},0);
        },{once:true,signal});
      },
    })),
  });
  // Pointer and keyboard activation are both preview-only, except for the explicitly
  // allowlisted Add/open buttons. In particular Enter must never submit a form.
  function guard(event:Event) {
    if(stopped || preparing || !(event.target instanceof Element) || event.target.closest(".driver-popover"))return;
    const step=steps[instance.getActiveIndex()??0];
    if(event.type === "click" && step?.activate && visibleTourElement(step.activate)?.contains(event.target))return;
    event.preventDefault();event.stopImmediatePropagation();
  }
  document.addEventListener("click",guard,true);document.addEventListener("submit",guard,true);
  document.addEventListener("beforeinput",guard,true);document.addEventListener("change",guard,true);
  document.body.setAttribute("data-portal-tour","active");
  signal.addEventListener("abort",stop,{once:true});
  await go(0);
  return {stop};
}
