import React, {Component} from 'react';
import axios from 'axios';
import './styles.scss';

const renderDriveList = (drives, clickHandle) => {
  if (drives.length) {
    return (
      <ul className={'drivelist'}>
        {drives.map((drive, index) =>
          <li key={index} className={'list-item'}>
            <button data-drive={drive.mountpoints[0].path} onClick={clickHandle}>
              {drive.mountpoints[0].path}
            </button>
          </li>
        )}
      </ul>
    )
  }
  else {
    return (
      <div className={'message-wrapper'}>
        <p>no drives</p>
      </div>
    );
  }
};

class Config extends Component {
  constructor(props) {
    super(props);

    this.state = {
      drives: [],
      hasDriveListLoaded: false,
      isDriveListLoading: false,
      videoPath: '',
    };

    this.pollInterval;
  }

  componentDidMount() {
    this.getDriveList();
    this.getVideoPath();

    this.pollInterval = setInterval(() => this.getDriveList(), 5000);
  }

  componentWillUnmount() {
    clearInterval(this.pollInterval);
  }

  async getDriveList() {
    this.setState({isDriveListLoading: true});

    const response = await axios.get('/drivelist');

    this.setState({
      drives: response.data,
      hasDriveListLoaded: true,
      isDriveListLoading: false
    });
  }

  handleVideoPathChange(e) {
    this.setState({videoPath: e.target.value});
  }

  handleDriveSelect(e) {
    if (confirm('Change drive?')) {
      this.setState({
        videoPath: e.target.getAttribute('data-drive')
      }, () => this.saveVideoPath(e));
    }
  }

  confirmSaveVideoPath(e) {
    if (confirm('Change video path?')) {
      this.saveVideoPath(e);
    }
  }

  async getVideoPath() {
    const response = await axios.get('/videopath');

    this.setState({videoPath: response.data});
  }

  async saveVideoPath(e) {
    e.preventDefault();
    await axios.post('/videopath', {videoPath: this.state.videoPath});
  }

  render() {
    return (
      <div className={'config-container'}>
        <div className={'videopath-form-wrapper'}>
          <form
            className={'form'}
            onSubmit={(e) => this.confirmSaveVideoPath(e)}
          >
            <input
              onChange={(e) => this.handleVideoPathChange(e)}
              placeholder={'video search path'}
              type={'text'}
              value={this.state.videoPath}
            />
            <button type={'submit'}>save</button>
          </form>
        </div>

        <div className={'list'}>
          <div className={'list-header'}>
            <h2>
              drives&nbsp;<small>({this.state.drives.length})</small>
            </h2>
          </div>

          <div className={'list-body'}>
            {
              (this.state.isDriveListLoading && !this.state.hasDriveListLoaded) ?
                <div className={'message-wrapper'}><p>loading...</p></div> :
                renderDriveList(this.state.drives, this.handleDriveSelect.bind(this))
            }
          </div>
        </div>
      </div>
    );
  }
}

export default Config;
