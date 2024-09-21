export const Controls = () => {
    return (
        <div className="buttons-container">
            <div className="flex-row row-1">
              <div className='btn'>Off</div>
              <div className='btn'>Parking</div>
              <div className='btn'>On</div>
              <div className='btn auto-lights-btn'>Auto</div>
              <div className='btn auto-high-beams-btn'>High Beams</div>
            </div>
            <div className='gap-row'></div>
            <div className="flex-row row-2">
              <div className='btn'>Fold Mirrors</div>
              <div className='btn'>Child Lock</div>
              <div className='btn'>Window Lock</div>
            </div>
            <div className='gap-row'></div>
            <div className="flex-row row-3">
              <div className='btn' id='wipers-on-off-btn'>On/Off</div>
              <div className='btn' id='wipers-auto-btn'>Auto</div>
              <div className='btn'>I</div>
              <div className='btn'>II</div>
              <div className='btn'>III</div>
              <div className='btn'>IIII</div>
            </div>
            <div className='gap-row'></div>
            <div className="flex-row row-4">
              <div className="flex-column">
                <div className='btn'>Mirrors</div>
                <div className='btn'>Steering</div>
              </div>
              <div className='gap-column'></div>
              <div className="flex-column">
                <div className='btn'>Dashcam</div>
                <div className='btn'>Sentry</div>
              </div>
              <div className='gap-column'></div>
              <div className="flex-column">
                <div className='btn'>Car Wash</div>
                <div className='btn'>Glovebox</div>
              </div>
            </div>
            <div className='gap-row'></div>
            <div className="flex-row row-5">
              <div className='brightness-slider'>
                <input type="range" min="0" max="100" value="50" />
              </div>
              <div className='btn brightness-auto-btn'>Auto</div>
            </div>
          </div>
    )
}